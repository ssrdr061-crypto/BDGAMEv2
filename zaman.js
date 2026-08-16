/* ═══════════════════════════════════════════════════════════════
   zaman.js — AÇILIŞ ÖLÇÜM ARACI  (tek kullanımlık)
   ---------------------------------------------------------------
   Açılışta hangi adımın kaç milisaniye sürdüğünü ve buluttan kaç
   KB indiğini ekrana yazar. Hiçbir dosyayı değiştirmez, oyunun
   çalışmasına karışmaz.

   Kullanım:
     1) index.html'in EN ALTINA ekle (bütün <script> satırlarından
        SONRA gelmeli):   <script src="zaman.js"></script>
     2) Oyunu şöyle aç:   ...vercel.app/?zaman=1
     3) Sağ üstteki ⏱ rozetine dokun, liste açılır
     4) İş bitince BU DOSYAYI VE O SATIRI SİL

   ?zaman=1 yoksa dosya hiçbir şey yapmaz.
   ═══════════════════════════════════════════════════════════════ */
(function () {
"use strict";

if (!/[?&]zaman=1/.test(location.search)) return;

const T0 = (window.performance && performance.timeOrigin) ? 0 : Date.now();
const simdi = () => Math.round(performance.now());

/* kayit: { t: açılıştan beri geçen ms, sure: kaç ms sürdü, ad, ek } */
const kayitlar = [];
function ekle(ad, t, sure, ek) {
  kayitlar.push({ ad: ad, t: t, sure: sure || 0, ek: ek || "" });
  tazele();
}

/* ═══════════════ 1) EKRAN ═══════════════ */
let acik = false;
const rozet = document.createElement("div");
rozet.textContent = "⏱";
rozet.style.cssText =
  "position:fixed;top:8px;right:8px;z-index:99998;width:42px;height:42px;" +
  "display:flex;align-items:center;justify-content:center;border-radius:50%;" +
  "background:linear-gradient(180deg,#1fa3ea,#0e6fc0);color:#fff;font-size:20px;" +
  "box-shadow:0 2px 6px rgba(0,20,45,.3);cursor:pointer;" +
  "-webkit-tap-highlight-color:transparent;";

const panel = document.createElement("div");
panel.style.cssText =
  "position:fixed;inset:0;z-index:99997;background:#0b1420;color:#eaf4ff;display:none;" +
  "font-family:'Baloo 2',monospace;font-size:12px;padding:14px 12px 70px;overflow:auto;" +
  "-webkit-overflow-scrolling:touch;";

rozet.addEventListener("click", () => {
  acik = !acik;
  panel.style.display = acik ? "block" : "none";
  tazele();
});

function ekleDom() {
  if (!document.body) return;
  if (!panel.parentNode) document.body.appendChild(panel);
  if (!rozet.parentNode) document.body.appendChild(rozet);
}
if (document.readyState === "loading")
  document.addEventListener("DOMContentLoaded", ekleDom);
else ekleDom();

let _cizZaman = 0;
function tazele() {
  if (!acik) return;
  if (simdi() - _cizZaman < 250) return;
  _cizZaman = simdi();
  ciz();
}

function ms(n) { return String(Math.round(n)).padStart(5) + " ms"; }

function ciz() {
  const sirali = kayitlar.slice().sort((a, b) => a.t - b.t);
  const agir = kayitlar.slice().sort((a, b) => b.sure - a.sure).slice(0, 8);

  let h = '<div style="font-weight:800;font-size:17px;margin-bottom:10px;">⏱ AÇILIŞ ÖLÇÜMÜ</div>';

  h += '<div style="font-weight:800;color:#ffd9a8;margin:12px 0 6px;">EN AĞIR 8 ADIM</div>';
  h += '<div style="line-height:1.7;">';
  agir.forEach(k => {
    if (k.sure <= 0) return;
    const renk = k.sure > 800 ? "#ff8b8b" : (k.sure > 250 ? "#ffd9a8" : "#7fe3a6");
    h += '<div><b style="color:' + renk + '">' + ms(k.sure) + '</b> &nbsp;' + k.ad +
         (k.ek ? ' <span style="opacity:.7">' + k.ek + '</span>' : '') + '</div>';
  });
  h += '</div>';

  h += '<div style="font-weight:800;color:#ffd9a8;margin:16px 0 6px;">SIRAYLA (açılıştan itibaren)</div>';
  h += '<div style="line-height:1.65;">';
  sirali.forEach(k => {
    const s = k.sure > 0 ? ' <b>+' + Math.round(k.sure) + 'ms</b>' : '';
    h += '<div><span style="opacity:.55">' + ms(k.t) + '</span> &nbsp;' + k.ad + s +
         (k.ek ? ' <span style="opacity:.7">' + k.ek + '</span>' : '') + '</div>';
  });
  h += '</div>';

  panel.innerHTML = h;
}

/* ═══════════════ 2) TARAYICI ZAMAN ÇİZELGESİ ═══════════════ */
try {
  const nav = performance.getEntriesByType("navigation")[0];
  if (nav) {
    ekle("HTML indi", Math.round(nav.responseEnd), Math.round(nav.responseEnd - nav.requestStart));
    ekle("DOM hazır", Math.round(nav.domContentLoadedEventEnd),
         Math.round(nav.domContentLoadedEventEnd - nav.responseEnd), "(scriptler çalıştı)");
  }
} catch (e) {}

window.addEventListener("load", () => {
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    if (nav) ekle("sayfa tam yüklendi", Math.round(performance.now()), 0);
  } catch (e) {}

  /* İndirilen dosyalar — en yavaş 6 tanesi */
  try {
    performance.getEntriesByType("resource")
      .slice().sort((a, b) => b.duration - a.duration).slice(0, 6)
      .forEach(r => {
        const ad = String(r.name).split("/").pop().split("?")[0];
        const kb = r.transferSize ? " · " + Math.round(r.transferSize / 1024) + " KB" : "";
        ekle("indirildi: " + ad, Math.round(r.startTime), Math.round(r.duration), kb);
      });
  } catch (e) {}
});

/* ═══════════════ 3) EKRANI KİLİTLEYEN İŞLER ═══════════════ */
try {
  new PerformanceObserver(list => {
    list.getEntries().forEach(e => {
      if (e.duration >= 120) ekle("⚠️ ekran dondu", Math.round(e.startTime), Math.round(e.duration));
    });
  }).observe({ entryTypes: ["longtask"] });
} catch (e) { /* bazı tarayıcılarda yok */ }

/* ═══════════════ 4) FIREBASE OKUMALARI ═══════════════
   Hangi düğümden kaç KB indiği ve ne kadar sürdüğü.
   firebaseDb geç oluşuyor, o yüzden bekleyip sarıyoruz.        */
function boyutKB(v) {
  try { return Math.round(JSON.stringify(v).length / 1024); } catch (e) { return -1; }
}

let _fbSarildi = false;
function firebaseSar() {
  if (_fbSarildi) return true;
  if (typeof firebaseDb === "undefined" || !firebaseDb || !firebaseDb.ref) return false;
  _fbSarildi = true;

  const orjRef = firebaseDb.ref.bind(firebaseDb);
  firebaseDb.ref = function (yol) {
    const r = orjRef(yol);
    const ad = String(yol == null ? "/" : yol);

    ["get", "once"].forEach(m => {
      if (typeof r[m] !== "function") return;
      const orj = r[m].bind(r);
      r[m] = function () {
        const bas = simdi();
        return orj.apply(null, arguments).then(snap => {
          let ek = "";
          try {
            const kb = boyutKB(snap && snap.val ? snap.val() : null);
            if (kb >= 0) ek = "· " + kb + " KB";
          } catch (e) {}
          ekle("bulut oku: " + ad, bas, simdi() - bas, ek);
          return snap;
        }).catch(e => {
          ekle("bulut HATA: " + ad, bas, simdi() - bas, "· " + (e && e.message));
          throw e;
        });
      };
    });

    if (typeof r.on === "function") {
      const orjOn = r.on.bind(r);
      r.on = function (olay, cb) {
        const bas = simdi();
        let ilk = true;
        const args = Array.prototype.slice.call(arguments);
        if (typeof cb === "function") {
          args[1] = function (snap) {
            if (ilk) {
              ilk = false;
              let ek = "";
              try {
                const kb = boyutKB(snap && snap.val ? snap.val() : null);
                if (kb >= 0) ek = "· " + kb + " KB";
              } catch (e) {}
              ekle("bulut dinle: " + ad, bas, simdi() - bas, ek);
            }
            return cb.apply(this, arguments);
          };
        }
        return orjOn.apply(null, args);
      };
    }
    return r;
  };
  ekle("firebase sarıldı", simdi(), 0);
  return true;
}

/* ═══════════════ 5) OYUN FONKSİYONLARI ═══════════════ */
const IZLENEN = [
  "startSessionFor", "loginAccount", "registerAccount",
  "loadAccounts", "saveAccounts", "persistCurrentState",
  "loadBattleLog", "loadBattleLogLocal", "saveBattleLogLocal",
  "hastaneyiDuzelt", "renderHospitalPanel",
  "renderBattleMap", "listenForCastles", "migrateCastlesOnce",
  "generateCastlePosLive", "publishCastle",
  "applyStaminaRegen", "applyFinishedHospitalRecoveries",
  "renderAll", "renderDiamonds", "renderTroops",
];
const _sarilanlar = {};

function fonksiyonSar(ad) {
  if (_sarilanlar[ad]) return;
  const f = window[ad];
  if (typeof f !== "function") return;
  _sarilanlar[ad] = true;
  window[ad] = function () {
    const bas = simdi();
    let r;
    try { r = f.apply(this, arguments); }
    finally {
      const sure = simdi() - bas;
      if (sure >= 8) ekle(ad + "()", bas, sure);
    }
    /* söz döndürüyorsa bitişini de ölç */
    if (r && typeof r.then === "function") {
      const bas2 = simdi();
      r.then(() => { const s = simdi() - bas2; if (s >= 30) ekle(ad + "() → bulut bekledi", bas2, s); },
             () => {});
    }
    return r;
  };
}

/* Dosyalar farklı zamanlarda yükleniyor; bir süre deneyip bırakıyoruz. */
let deneme = 0;
const iv = setInterval(() => {
  deneme++;
  firebaseSar();
  IZLENEN.forEach(fonksiyonSar);
  if (deneme > 120) clearInterval(iv);   /* ~30 sn */
}, 250);

firebaseSar();
IZLENEN.forEach(fonksiyonSar);
ekle("ölçüm başladı", simdi(), 0);

})();
