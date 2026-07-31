/* ============================================================
   missile.js — Füze PvP Modülü (kod.html'e SADECE 1 script satırıyla bağlanır)
   ------------------------------------------------------------
   kod.html'de HİÇBİR değişiklik gerekmez; bu dosya oyunun zaten global olan
   parçalarına dışarıdan asılır:
     - renderBattleMap()  → sarmalanır, kalelere HP barı + 🚀 butonu eklenir
     - firebaseDb, toFirebaseKey, currentUsername, state, COORD_GRID
     - bindTap, showToast
   Veriler Firebase'de "pvp/{oyuncuKey}" altında tutulur:
     { hp: number, missiles: number, brokenAt: ms|null }
   ============================================================ */
(function () {
  "use strict";

  /* ---------- AYARLAR (tek yerden değiştir) ---------- */
  const CASTLE_MAX_HP   = 1000;   // kale tam canı
  const MISSILE_DAMAGE  = 1000;    // bir füzenin hasarı
  const START_MISSILES  = 1;      // yeni hesaba verilen füze
  const SECONDS_PER_CELL = 0.5;   // füzenin harita karesinde uçuş süresi (sn)
  const LAUNCH_OFFSET_Y = -1; // kalkış hizası: eksi = kendi kalenin üstünden fırlar
  const IMPACT_OFFSET_Y = -1; // füzenin vuruş noktası: eksi = kalenin üstü (kare cinsinden)
  const CASTLE_REGEN_PER_HOUR = 150; // kale HP'si saatte bu kadar kendini onarır (genel canla aynı hız)
  const BROKEN_THRESHOLD = 150; // Kalenin saldırıya açılması için gereken minimum HP
                               // 150 HP = tam 1 saat yenilenme süresi

  // Görseller. Dosyalar missile.js ile AYNI klasörde olmalı (veya birleştiriciyle gömülür).
  // Bulunamazsa otomatik 🚀 / 💥 emojisine düşer. PNG/GIF şeffaflığı destekler.
  const SPRITE = {
    rocket: "fuze_Fuze-roket.webp",    // şeffaf roket görseli (burnu YUKARI bakmalı)
    impact: "fuze_fuze-patlama.gif",  // şeffaf patlama animasyonu
    size: 64,                     // px (roket boyutu)
    impactSize: 550,              // px (patlama boyutu)
    boomLiftCells: 3,             // patlamayı bulunan noktadan KAÇ KARE yukarı kaydır (0 = kaydırma)
    rocketFacing: -90,            // roket görselinin baktığı yön: -90=yukarı, 0=sağa, 90=aşağı, 180=sola
    // Düşüş evresi: hedefe yaklaşınca roket burnunu kademe kademe aşağı kırar.
    diveStartAt: 0.94,   // son %6'da dönsün (aşağıda neden)
diveSteps: 10,       // 6 yerine 10 kademe (4 ekstra açı)
diveStepDeg: 12,     // 10 x 12 = yine 120 derece
  };

  /* ---------- İÇ DURUM ---------- */
  let myKey = null;                 // toFirebaseKey(currentUsername)
  let pvpData = {};                 // { key: {hp, missiles, brokenAt} }
  let _pvpRef = null;
  let _lastKnownOwnHp = null;

  function fbReady() { return typeof firebaseDb !== "undefined" && firebaseDb; }

  function keyOf(name) {
    return toFirebaseKey(String(name || "").toLowerCase());
  }

  // Son vuruştan (hitAt) bu yana geçen süreye göre kale HP'si kademeli dolar.
  // Veri tabanına sürekli yazmaya gerek yok; okurken hesaplanır ("tembel" yenilenme).
  function effectiveHp(rec) {
    if (!rec) return CASTLE_MAX_HP;
    const base = typeof rec.hp === "number" ? rec.hp : CASTLE_MAX_HP;
    const hitAt = rec.hitAt || rec.brokenAt; // eski kayıtlarla uyumluluk
    if (!hitAt) return Math.max(0, Math.min(CASTLE_MAX_HP, base));
    const regen = ((Date.now() - hitAt) / 3600000) * CASTLE_REGEN_PER_HOUR;
    return Math.max(0, Math.min(CASTLE_MAX_HP, Math.floor(base + regen)));
  }

  /* ---------- FIREBASE ---------- */
  function ensureOwnRecord() {
    if (!fbReady() || !myKey) return;
    firebaseDb.ref("pvp/" + myKey).transaction(cur => {
      if (cur == null) return { hp: CASTLE_MAX_HP, missiles: START_MISSILES, hitAt: null };
      // Birikmiş yenilenmeyi kalıcı yaz (hp'yi güncelle, sayacı sıfırla).
      const eff = effectiveHp(cur);
      cur.hp = eff;
      cur.hitAt = eff >= CASTLE_MAX_HP ? null : Date.now();
      if ("brokenAt" in cur) cur.brokenAt = null; // eski alan temizliği
      return cur;
    });
  }

  function startListening() {
    if (!fbReady() || _pvpRef) return;
    _pvpRef = firebaseDb.ref("pvp");
    _pvpRef.on("value", snap => {
      pvpData = snap.val() || {};
      // Saldırıya uğradıysak bildir.
      const mine = pvpData[myKey];
      if (mine) {
        const hpNow = effectiveHp(mine);
        if (_lastKnownOwnHp !== null && hpNow < _lastKnownOwnHp) {
          const kayip = _lastKnownOwnHp - hpNow;
          showToast(`🚨 Kalen füze saldırısına uğradı! -${kayip} HP`, 4000);
        }
        _lastKnownOwnHp = hpNow;
        // Biriken genel can hasarını tüket (çevrimiçiyken anında,
        // çevrimdışıyken bir sonraki girişte bu dinleyici zaten çalışır).
        if (mine.pendingStamina > 0) consumePendingStamina();
      }
      decorateCastles(); // barları güncelle
      updateHudPill();
    });
  }

  // Firebase'de biriken genel can hasarını transaction ile sıfırlayıp
  // yerel stamina'dan düşer. Transaction sayesinde aynı hasar iki kez uygulanmaz
  // (iki cihazdan giriş yapılsa bile birikimi yalnızca biri kapabilir).
  let _consumingStamina = false;
  function consumePendingStamina() {
    if (_consumingStamina || !fbReady() || !myKey) return;
    if (typeof state === "undefined" || !state.stamina) return;
    _consumingStamina = true;
    let alinan = 0; // transaction içinden güvenle yakalanır
    firebaseDb.ref("pvp/" + myKey + "/pendingStamina").transaction(cur => {
      if (!cur || cur <= 0) return; // alınacak bir şey yok → iptal
      alinan = cur;
      return 0; // birikimi sıfırla
    }, (err, committed) => {
      _consumingStamina = false;
      if (err || !committed || alinan <= 0) return;
      state.stamina.current = Math.max(0, state.stamina.current - alinan);
      if (typeof renderStamina === "function") renderStamina();
      if (typeof persistCurrentState === "function") persistCurrentState();
      showToast(`💔 Füze saldırısı genel canını -${alinan} düşürdü!`, 4000);
    });
  }

  function myMissiles() {
    const mine = pvpData[myKey];
    return mine && typeof mine.missiles === "number" ? mine.missiles : 0;
  }

  /* ---------- SALDIRI ---------- */
  function fireMissile(targetName, tx, ty) {
    if (!fbReady() || !myKey) { showToast("Bağlantı yok, füze atılamaz."); return; }
    if (myMissiles() <= 0) { showToast("Füzen kalmadı! 🚀"); return; }
    const tKey = keyOf(targetName);
    if (tKey === myKey) { showToast("Kendi kaleni vuramazsın."); return; }
    if (!state.castle) { showToast("Önce kalen olmalı."); return; }

    const tRec = pvpData[tKey];
    if (effectiveHp(tRec) <= 0) { showToast("Bu kale zaten yıkık, onarılmasını bekle."); return; }

    // Önce kendi füzeni düş (yarış koşullarına karşı transaction).
    firebaseDb.ref("pvp/" + myKey + "/missiles").transaction(cur => {
      if ((cur || 0) <= 0) return; // iptal
      return cur - 1;
    }, (err, committed) => {
      if (err || !committed) { showToast("Füze atılamadı."); return; }
      const dist = Math.hypot(tx - state.castle.gx, ty - state.castle.gy);
      const flightMs = Math.max(800, dist * SECONDS_PER_CELL * 1000);

      // Fırlatmayı Firebase'e yaz — animasyon HERKESİN ekranında
      // listenLaunches() dinleyicisi tarafından oynatılır.
      firebaseDb.ref("pvp_launches").push({
        from: myKey,
        target: tKey,
        targetName: targetName,
        fx: state.castle.gx,
        fy: state.castle.gy + LAUNCH_OFFSET_Y,
        tx: tx,
        ty: ty + IMPACT_OFFSET_Y,
        flightMs: flightMs,
        at: Date.now(),
      }).catch(() => {
        showToast("Füze fırlatılamadı (bağlantı hatası).");
      });
    });
  }

  // Vuruş anı: hedefin HP'sini düşür. SADECE atan istemci çağırır,
  // yoksa iki oyuncu da hasarı uygular ve hasar ikiye katlanır.
  function applyDamage(tKey, targetName) {
    firebaseDb.ref("pvp/" + tKey).transaction(cur => {
      cur = cur || { hp: CASTLE_MAX_HP, missiles: START_MISSILES, hitAt: null };
      let hp = effectiveHp(cur); // vuruş anına kadar birikmiş yenilenme dahil
      hp = Math.max(0, hp - MISSILE_DAMAGE);
      cur.hp = hp;
      cur.hitAt = Date.now(); // yenilenme sayacı bu andan itibaren işler
      cur.noAttackUntil = Date.now() + 24 * 60 * 60 * 1000; // füze yiyen 24 saat saldıramaz (füze hariç)
      if ("brokenAt" in cur) cur.brokenAt = null; // eski alan temizliği
      // Genel can hasarını Firebase'de BİRİKTİR — kurban çevrimdışıysa bile
      // bir sonraki girişinde kendi istemcisi bu birikimi okuyup canından düşer.
      cur.pendingStamina = (cur.pendingStamina || 0) + MISSILE_DAMAGE;
      return cur;
    });
  }

  // Fırlatma olaylarını dinle: kim atarsa atsın roket herkeste uçar.
  let _launchRef = null;
  function listenLaunches() {
    if (!fbReady() || _launchRef) return;
    _launchRef = firebaseDb.ref("pvp_launches").orderByChild("at").startAt(Date.now() - 5000);
    _launchRef.on("child_added", snap => {
      const m = snap.val();
      if (!m || typeof m.at !== "number") return;

      const elapsed = Date.now() - m.at;
      const remaining = m.flightMs - elapsed;

      // Füze çoktan varmışsa animasyonu atla; hasar atan tarafta yine uygulansın.
      if (remaining <= 0) {
        if (m.from === myKey) applyDamage(m.target, m.targetName);
        cleanupLaunch(snap, m, 0);
        return;
      }

      // Geç bağlanan taraf füzeyi ARA konumdan başlatır → iki ekran senkron.
      const p = Math.max(0, elapsed / m.flightMs);
      const fx = m.fx + (m.tx - m.fx) * p;
      const fy = m.fy + (m.ty - m.fy) * p;

      animateMissile(fx, fy, m.tx, m.ty, remaining, () => {
        if (m.from === myKey) applyDamage(m.target, m.targetName);
      }, m.targetName);

      cleanupLaunch(snap, m, remaining);
    });
  }

  // Kayıt tek kullanımlık: uçuş bittikten biraz sonra atan taraf siler.
  function cleanupLaunch(snap, m, remaining) {
    if (m.from !== myKey) return;
    setTimeout(() => { snap.ref.remove().catch(() => {}); }, remaining + 4000);
  }

  /* ---------- ANİMASYON ---------- */
  function makeSprite(kind) {
    // kind: "rocket" veya "impact". Görsel varsa PNG/GIF, yoksa emoji.
    const src = SPRITE[kind];
    const el = document.createElement("div");
    el.className = "msl-sprite";
    if (src) {
      const img = document.createElement("img");
      img.src = src.startsWith("data:") ? src : src + (kind === "impact" ? ("?t=" + Date.now()) : ""); // GIF baştan oynasın (gömülü data URL'ye dokunma)
      const sz = kind === "impact" ? (SPRITE.impactSize || SPRITE.size) : SPRITE.size;
      img.style.cssText = `width:${sz}px;height:${sz}px;object-fit:contain;display:block;`;
      img.onerror = () => { img.remove(); el.textContent = kind === "impact" ? "💥" : "🚀"; };
      el.appendChild(img);
    } else {
      el.textContent = kind === "impact" ? "💥" : "🚀";
    }
    return el;
  }

  // Açıyı -180..180 aralığına indirger (en kısa dönüş yönü için).
  function normDeg(a) { a = ((a % 360) + 360) % 360; return a > 180 ? a - 360 : a; }

  function animateMissile(fx, fy, tx, ty, durMs, onImpact, targetName) {
    const toPct = v => (v / COORD_GRID) * 100;
    const getMap = () => document.getElementById("battleMap");
    if (!getMap()) { onImpact(); return; }

    // Uçuş: her karede JS konumlandırır (rAF). Harita yeniden çizilse bile
    // roket kaybolmaz — DOM'dan düştüyse kendini geri ekler.
    const fly = makeSprite("rocket");
    // Roket görseli yukarı baktığı için: ekran açısı = rota açısı - rocketFacing
    const cruiseRot = Math.atan2(ty - fy, tx - fx) * 180 / Math.PI - (SPRITE.rocketFacing || 0);
    // Düşüş hedef açısı: burnu ekranda tam AŞAĞI göstersin (aşağı = 90° - rocketFacing)
    const diveRot = 90 - (SPRITE.rocketFacing || 0);
    const diveDiff = normDeg(diveRot - cruiseRot); // en kısa yönden dönüş farkı
    fly.style.setProperty("--msl-rot", cruiseRot + "deg");
    const t0 = performance.now();

    function step(now) {
      const p = Math.min(1, (now - t0) / durMs); // 0→1 ilerleme
      const gx = fx + (tx - fx) * p;
      const gy = fy + (ty - fy) * p;
      fly.style.left = toPct(gx) + "%";
      fly.style.top  = toPct(gy) + "%";

      // Düşüş evresi: diveStartAt sonrası burun kademe kademe aşağı kırılır.
      let rot = cruiseRot;
      if (p >= SPRITE.diveStartAt) {
        const t = (p - SPRITE.diveStartAt) / (1 - SPRITE.diveStartAt); // 0→1
        const stepNo = Math.min(SPRITE.diveSteps, Math.ceil(t * SPRITE.diveSteps)); // 1..6 kademe
        const sign = diveDiff >= 0 ? 1 : -1;
        const extra = sign * Math.min(Math.abs(diveDiff), stepNo * SPRITE.diveStepDeg);
        rot = cruiseRot + extra;
      }
      fly.style.setProperty("--msl-rot", rot + "deg");
      const mapEl = getMap();
      if (mapEl && !fly.isConnected) mapEl.appendChild(fly); // harita yenilendiyse geri tak
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        fly.remove();
        const boom = makeSprite("impact");
        // Patlamayı ızgara noktasına değil, hedef kale GÖRSELİNİN merkezine oturt.
        let bx = toPct(tx) + "%", by = toPct(ty) + "%";
        const mEl0 = getMap();
        if (mEl0 && targetName) {
          const node = [...mEl0.querySelectorAll(".castle-node")].find(n => n.dataset.cname === targetName);
          // Kale RESMİNİ bul: bizim eklediklerimiz (hp barı, buton) ve isim etiketi hariç,
          // alan olarak EN BÜYÜK alt eleman kalenin görselidir.
          let imgEl = node ? node.querySelector("img") : null;
          if (node && !imgEl) {
            let best = null, bestArea = 0;
            node.querySelectorAll("*").forEach(ch => {
              if (ch.closest(".msl-hpbar") || ch.closest(".msl-btn")) return;
              const t = (ch.textContent || "").trim();
              if (t && t === targetName) return; // isim etiketi
              const r = ch.getBoundingClientRect();
              const area = r.width * r.height;
              if (area > bestArea) { bestArea = area; best = ch; }
            });
            imgEl = best || node;
          }
          if (imgEl) {
            const mr = mEl0.getBoundingClientRect(), ir = imgEl.getBoundingClientRect();
            if (mr.width && mr.height) {
              bx = ((ir.left + ir.width / 2 - mr.left) / mr.width * 100) + "%";
              by = (((ir.top + ir.height / 2 - mr.top) / mr.height * 100) - (SPRITE.boomLiftCells || 0) * (100 / COORD_GRID)) + "%";
            }
          }
        }
        boom.style.left = bx; boom.style.top = by;
        const m = getMap();
        if (m) {
          m.appendChild(boom);
          // Patlama da render'a karşı korunur (kısa ömürlü koruma döngüsü).
          const bt = setInterval(() => {
            const mm = getMap();
            if (mm && !boom.isConnected) mm.appendChild(boom);
          }, 200);
          setTimeout(() => { clearInterval(bt); boom.remove(); }, 5000);
        }
        onImpact();
      }
    }
    requestAnimationFrame(step);
  }

  /* ---------- HARİTA SÜSLEME (HP barı + buton) ---------- */
  function decorateCastles() {
    const mapEl = document.getElementById("battleMap");
    if (!mapEl) return;
    mapEl.querySelectorAll(".castle-node").forEach(node => {
      const name = node.dataset.cname;
      const isOwn = node.classList.contains("castle-own");
      const rec = pvpData[isOwn ? myKey : keyOf(name)];
      const hp = effectiveHp(rec);
      const pct = Math.round((hp / CASTLE_MAX_HP) * 100);

      // HP barı (varsa güncelle, yoksa ekle)
      let bar = node.querySelector(".msl-hpbar");
      if (!bar) {
        bar = document.createElement("div");
        bar.className = "msl-hpbar";
        bar.innerHTML = `<i></i>`;
        node.appendChild(bar);
      }
      const fill = bar.querySelector("i");
      fill.style.width = pct + "%";
      fill.style.background = pct > 50 ? "#5ec46a" : pct > 20 ? "#e0b24a" : "#e05a4a";
      bar.title = `Kale: ${hp}/${CASTLE_MAX_HP}`;

      // Füze butonu haritada GÖSTERİLMİYOR — füzeye kale kutucuğundaki
      // 🚀 üzerinden (pvp.js → MISSILE_API) erişiliyor.
      // Yıkık görünüm
      node.classList.toggle("msl-broken", hp < BROKEN_THRESHOLD);
    });
  }

  // HUD'da füze sayacı (elmas pill'lerin yanına küçük bir rozet)
  function updateHudPill() {
    let pill = document.getElementById("mslHudPill");
    if (!pill) {
      const anchor = document.getElementById("logoutBtn");
      if (!anchor || !anchor.parentNode) return;
      pill = document.createElement("div");
      pill.id = "mslHudPill";
      pill.className = "hud-pill";
      anchor.parentNode.insertBefore(pill, anchor);
    }
    pill.textContent = "🚀 " + myMissiles();
  }

  /* ---------- ÖZEL ONAY PANELİ ---------- */
  function showMissileConfirm(targetName, onConfirm) {
    // Zaten açık panel varsa kapat
    const old = document.getElementById("mslConfirmOverlay");
    if (old) old.remove();

    const overlay = document.createElement("div");
    overlay.id = "mslConfirmOverlay";
    overlay.className = "msl-confirm-overlay";

    const panel = document.createElement("div");
    panel.className = "msl-confirm-panel";

    const msg = document.createElement("p");
    msg.className = "msl-confirm-msg";
    msg.textContent = "Başkanım! Teknolojik roket sistemlerini kullanmak acımasız bir şekilde rakibe zarar verecektir. Gerçekten kullanmak istiyor musunuz!";

    const btnRow = document.createElement("div");
    btnRow.className = "msl-confirm-btns";

    const btnConfirm = document.createElement("button");
    btnConfirm.className = "msl-cbtn msl-cbtn-ok";
    btnConfirm.textContent = "Onayla ✅";

    const btnCancel = document.createElement("button");
    btnCancel.className = "msl-cbtn msl-cbtn-cancel";
    btnCancel.textContent = "Vazgeç ❌";

    btnRow.appendChild(btnConfirm);
    btnRow.appendChild(btnCancel);
    panel.appendChild(msg);
    panel.appendChild(btnRow);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    // Animasyon ile göster
    requestAnimationFrame(() => overlay.classList.add("msl-confirm-show"));

    function close() { overlay.classList.remove("msl-confirm-show"); setTimeout(() => overlay.remove(), 250); }

    bindTap(btnConfirm, () => { close(); onConfirm(); });
    bindTap(btnCancel, () => { close(); });
    bindTap(overlay, (e) => { if (e.target === overlay) close(); });
  }

  /* ---------- DIŞA AÇILAN API ----------
     pvp.js kale kutucuğundaki 🚀 butonundan buraya erişir:
       window.MISSILE_API.open(hedefAdı, tx, ty)
     open() önce onay panelini gösterir, onaylanırsa füzeyi fırlatır. */
  window.MISSILE_API = {
    open: function (targetName, tx, ty) {
      if (!fbReady() || !myKey) { showToast("Bağlantı yok, füze atılamaz."); return; }
      if (myMissiles() <= 0) { showToast("Füzen kalmadı! 🚀"); return; }
      showMissileConfirm(targetName, function () {
        fireMissile(targetName, tx, ty);
      });
    },
    // Onaysız doğrudan fırlatma (gerekirse)
    fire: function (targetName, tx, ty) { fireMissile(targetName, tx, ty); },
    // Kalan füze sayısı
    count: function () { return myMissiles(); },
    // Füze yiyince 24 saat saldırı kilidi biter zamanı (ms). 0 = kilit yok.
    attackLockedUntil: function () {
      const mine = pvpData[myKey];
      return (mine && typeof mine.noAttackUntil === "number") ? mine.noAttackUntil : 0;
    },
    // Mağazadan füze satın alınınca çağrılır: n adet füzeyi buluta (pvp/{myKey}/missiles) ekler.
    addMissiles: function (n, onDone) {
      n = Math.max(1, parseInt(n, 10) || 1);
      if (!fbReady() || !myKey) { if (typeof onDone === "function") onDone(false); return; }
      firebaseDb.ref("pvp/" + myKey).transaction(function (cur) {
        cur = cur || { hp: CASTLE_MAX_HP, missiles: START_MISSILES, hitAt: null };
        cur.missiles = (typeof cur.missiles === "number" ? cur.missiles : 0) + n;
        return cur;
      }, function (err, committed) {
        if (typeof onDone === "function") onDone(!err && committed);
      });
    }
  };

  /* ---------- renderBattleMap SARMALAMA ---------- */
  function wrapRender() {
    const orig = window.renderBattleMap;
    if (typeof orig !== "function" || orig.__mslWrapped) return;
    const wrapped = function () {
      orig.apply(this, arguments);
      decorateCastles();
    };
    wrapped.__mslWrapped = true;
    window.renderBattleMap = wrapped;
  }

  /* ---------- STİLLER ---------- */
  function injectStyles() {
    const s = document.createElement("style");
    s.textContent = `
      .msl-sprite{position:absolute;transform:translate(-50%,-50%) rotate(var(--msl-rot,0deg));
        font-size:28px;z-index:60;pointer-events:none;filter:drop-shadow(0 0 6px rgba(255,140,40,.8));}
      .msl-hpbar{position:absolute;left:50%;transform:translateX(-50%);bottom:-8px;
        width:44px;height:5px;border-radius:3px;background:rgba(0,0,0,.55);
        border:1px solid rgba(255,255,255,.25);overflow:hidden;}
      .msl-hpbar i{display:block;height:100%;border-radius:2px;transition:width .4s;}
      .msl-btn{position:absolute;top:-14px;right:-14px;width:26px;height:26px;
        border-radius:50%;background:rgba(20,20,30,.85);border:1px solid rgba(255,120,60,.6);
        display:flex;align-items:center;justify-content:center;font-size:14px;cursor:pointer;z-index:5;}
      .msl-btn:active{transform:scale(.9);}
      .msl-broken .node-avatar{filter:grayscale(1) brightness(.6);}

      /* ÖZEL ONAY PANELİ */
      .msl-confirm-overlay{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;
        justify-content:center;background:rgba(0,0,0,0);transition:background .25s ease;
        -webkit-backdrop-filter:blur(0px);backdrop-filter:blur(0px);}
      .msl-confirm-overlay.msl-confirm-show{background:rgba(0,0,0,.55);
        -webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);}
      .msl-confirm-panel{background:#4DD8F0;border-radius:18px;padding:28px 24px 22px;
        max-width:340px;width:88%;box-shadow:0 8px 40px rgba(0,0,0,.45),0 0 0 1.5px rgba(255,255,255,.15) inset;
        transform:scale(.7) translateY(30px);opacity:0;transition:transform .3s cubic-bezier(.34,1.56,.64,1),opacity .25s ease;}
      .msl-confirm-show .msl-confirm-panel{transform:scale(1) translateY(0);opacity:1;}
      .msl-confirm-msg{color:#000;font-weight:900;font-size:15.5px;line-height:1.55;
        text-align:center;margin:0 0 22px;font-family:'Segoe UI Black','Arial Black',sans-serif;}
      .msl-confirm-btns{display:flex;gap:12px;justify-content:center;}
      .msl-cbtn{flex:1;padding:13px 0;border:none;border-radius:12px;font-size:15px;
        font-weight:900;font-family:'Segoe UI Black','Arial Black',sans-serif;
        cursor:pointer;transition:transform .12s,box-shadow .12s;letter-spacing:.3px;}
      .msl-cbtn:active{transform:scale(.93);}
      .msl-cbtn-ok{background:#1a1a1a;color:#4DD8F0;
        box-shadow:0 3px 12px rgba(0,0,0,.35);}
      .msl-cbtn-ok:active{box-shadow:0 1px 4px rgba(0,0,0,.3);}
      .msl-cbtn-cancel{background:rgba(0,0,0,.12);color:#000;
        box-shadow:0 2px 8px rgba(0,0,0,.15);}
      .msl-cbtn-cancel:active{box-shadow:0 1px 3px rgba(0,0,0,.1);}
    `;
    document.head.appendChild(s);
  }

  /* ---------- BAŞLATMA ---------- */
  // currentUsername login sonrası dolduğu için hazır olana dek bekleriz.
  function boot() {
    injectStyles();
    const t = setInterval(() => {
      if (typeof currentUsername !== "undefined" && currentUsername && fbReady()) {
        clearInterval(t);
        myKey = keyOf(currentUsername);
        // Eski hesapları yeni genel can sistemine taşı (100 → 1000, oran korunur).
        if (typeof state !== "undefined" && state.stamina && state.stamina.max < 1000) {
          const oran = state.stamina.current / state.stamina.max;
          state.stamina.max = 1000;
          state.stamina.current = Math.round(1000 * oran);
          if (typeof renderStamina === "function") renderStamina();
          if (typeof persistCurrentState === "function") persistCurrentState();
        }
        wrapRender();
        ensureOwnRecord();
        startListening();
        listenLaunches();
        if (typeof renderBattleMap === "function") renderBattleMap();
      }
    }, 600);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
