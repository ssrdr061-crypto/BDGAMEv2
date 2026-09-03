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
  /* KAYIT BİÇİMİ — DEĞİŞTİRME.
     pvp_launches'a fy/ty bu kaydırma UYGULANMIŞ yazılır. Eskiden çizim de
     doğrudan bunu kullanıyordu. İzometride gy-1 ekranda yukarı değil ÇAPRAZ
     gittiği için çizim ekran dikeyini kullanıyor (KALKIS/VURUS_KALDIR_KARE) —
     ama kablo biçimi aynı bırakıldı. Sebep: önbellekte kalmış eski sürüm bir
     oyuncu aynı kaydı okuyup yazabilir. Biçim değişseydi roket onun ekranında
     kalenin ortasından, bizimkinde iki kare yukarıdan çıkardı.
     Çizimden önce animateMissile bu kaydırmayı geri söker. */
  const KAYIT_OFFSET_Y = -1;

  /* Uçuş yolunun ekran dikeyinde kaç KARE yukarıdan geçtiği.
     VURUS_KALDIR_KARE, roketin çakıldığı ve patlamanın oluştuğu noktanın
     ORTAK çapasıdır — ikisi aynı yerden beslenir, yoksa roket bir yerde
     bitip patlama başka yerde açılıyor ("kalenin önünde patlıyor" hissi
     bundandı). 0 = karonun tam ortası (kale görselinin dibi kalıyor),
     1 = kale gövdesinin üstü. */
  const KALKIS_KALDIR_KARE = 1;
  const VURUS_KALDIR_KARE  = 1;
  const CASTLE_REGEN_PER_HOUR = 150; // kale HP'si saatte bu kadar kendini onarır (genel canla aynı hız)
  const BROKEN_THRESHOLD = 150; // Kalenin saldırıya açılması için gereken minimum HP
                               // 150 HP = tam 1 saat yenilenme süresi

  // Görseller. Dosyalar missile.js ile AYNI klasörde olmalı (veya birleştiriciyle gömülür).
  // Bulunamazsa otomatik 🚀 / 💥 emojisine düşer. PNG/GIF şeffaflığı destekler.
  const SPRITE = {
    rocket: "fuze_Fuze-roket.webp",    // şeffaf roket görseli (burnu YUKARI bakmalı)
    impact: "fuze_fuze-patlama.gif",  // şeffaf patlama animasyonu
    size: 64,                     // px (roket boyutu)
    impactSize: 110,              // px (patlama boyutu — eskiden 550)
    /* Patlamanın vuruş noktasından EK kaydırması. 0 = roketin çakıldığı
       noktanın tam üstünde patlar. Bunu ancak GIF'in parlak merkezi
       görselin ortasında değilse oynat; uçuş yüksekliği için
       VURUS_KALDIR_KARE kullanılır. */
    boomLiftCells: 0,
    rocketFacing: -90,            // roket görselinin baktığı yön: -90=yukarı, 0=sağa, 90=aşağı, 180=sola
    /* Düşüş evresi: hedefe yaklaşınca roket burnunu kademe kademe kırar.
       diveOran = tam dikeye göre ne kadar döneceği. 1 = burun tam aşağı
       (çok dik, çakılma gibi durmuyor), 0 = hiç dönme. 0.55 civarı,
       roketin hedefe yatık bir açıyla dalmasını verir. */
    diveStartAt: 0.85,   // son %15'lik yolda dönmeye başlasın
    diveSteps: 2,        // kaç kademede dönsün (2 = "bir iki eğim alıp dalsın")
    diveOran: 0.55,      // tam dikeyin ne kadarına gitsin
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
        // Füze kalkanımızı kırdıysa kendi kaydımızdan da düşür.
        if (mine.kbKirik) kendiKalkaniDusur(Number(mine.kbKirik) || 0);
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

  /* ---------- SALDIRI ----------
     kalkanBitis > 0 ise bu füze KALKAN KIRICIDIR: uçar, ama patlama
     oynatılmaz, kale HP'si düşmez, genel can gitmez, 24 saatlik
     saldırı kilidi kurulmaz. Tek yaptığı hedefin kalkanını düşürmek.
     İkinci füze artık kalkansız kaleye normal hasar verir.
     Değerin kendisi kırılan kalkanın BİTİŞ damgasıdır (bkz. kalkanKir). */
  function fireMissile(targetName, tx, ty, kalkanBitis) {
    kalkanBitis = Number(kalkanBitis) || 0;
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

      /* ── KENDİ FÜZEN ANINDA KALKAR ──
         Eskiden animasyonu YALNIZ listenLaunches başlatıyordu: kayıt
         Firebase'e gidiyor, sunucudan child_added olarak geri geliyor,
         ancak ondan sonra roket çiziliyordu. Aradaki iki yönlü ağ
         gecikmesi "füze kaleden çıkarken görünmüyor, sonradan beliriyor"
         belirtisiydi. Artık kendi füzemiz yerelde hemen başlar; aynı
         kayıt geri geldiğinde anahtarından tanınıp atlanır (yoksa iki
         roket birden uçardı). Başka oyuncuların füzeleri eskisi gibi
         dinleyiciden gelir. */
      const kayit = {
        from: myKey,
        target: tKey,
        targetName: targetName,
        fx: state.castle.gx,
        fy: state.castle.gy + KAYIT_OFFSET_Y,
        tx: tx,
        ty: ty + KAYIT_OFFSET_Y,
        flightMs: flightMs,
        at: Date.now(),
      };
      /* Firebase undefined'ı SENKRON reddeder — alan yalnız değer
         varken yazılır. sb = kırılacak kalkanın bitiş damgası; başka
         oyuncuların istemcisi de bunu görüp patlamayı oynatmaz. */
      if (kalkanBitis > 0) kayit.sb = kalkanBitis;

      const ref = firebaseDb.ref("pvp_launches").push();
      _yerelFuzeler[ref.key] = true;

      animateMissile(kayit.fx, kayit.fy, kayit.tx, kayit.ty, flightMs, () => {
        if (kalkanBitis > 0) kalkanKir(tKey, targetName, kalkanBitis);
        else                 applyDamage(tKey, targetName);
      }, targetName, true, kalkanBitis > 0);

      ref.set(kayit).catch(() => {
        showToast("Füze fırlatılamadı (bağlantı hatası).");
      });
      /* Kayıt tek kullanımlık: uçuş bittikten sonra atan taraf siler. */
      setTimeout(() => { ref.remove().catch(() => {}); }, flightMs + 4000);
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

  /* ── KALKAN KIRMA ──────────────────────────────────────────────
     Kalkanın gerçeği savunanın accounts/{ad}.state.kalkanBitis
     alanındadır ve saldıran oraya YAZAMAZ (Tuzak 4). O yüzden kırılma
     pendingStamina ile aynı posta kutusuna yazılır:

       pvp/{hedefKey}.kbKirik = kırılan kalkanın BİTİŞ damgası

     Damga "şu ana kadarki kalkanlar geçersiz" demektir; kurban sonra
     yeni kalkan alırsa kalkanBitis > kbKirik olur ve kalkan yine
     geçerlidir. Bu yüzden damga temizlenmez.

     Okuyan tek kapı: MISSILE_API.kalkanKirikMi() → pvp.js kalkanKalan().
     Kurban çevrimiçi olduğunda kendiKalkaniDusur() kendi state'ini
     ve castles/{key}/kb'yi temizler.                                */
  function kalkanKir(tKey, targetName, kalkanBitis) {
    firebaseDb.ref("pvp/" + tKey).transaction(cur => {
      cur = cur || { hp: CASTLE_MAX_HP, missiles: START_MISSILES, hitAt: null };
      const eski = Number(cur.kbKirik || 0) || 0;
      const yeni = Number(kalkanBitis) || 0;
      cur.kbKirik = Math.max(eski, yeni);
      return cur;
    }, (err, committed) => {
      if (err || !committed) {
        showToast("Kalkan kırılamadı (bağlantı hatası).", 4000);
        return;
      }
      showToast(`🛡️ ${targetName} oyuncusunun kalkanı kırıldı! Kale artık savunmasız.`, 5000);
      if (typeof renderBattleMap === "function") renderBattleMap();
    });
  }

  /* ── KURBAN TARAFI: kırılan kalkanı kendi kaydından da düşür ──
     Damgayı yalnız kalkanın SAHİBİ silebilir; saldıran onun hesabına
     yazamıyor. Kurban çevrimiçi olur olmaz (ya da bir sonraki
     girişinde) bu çalışır ve castles/{key}/kb de temizlenir —
     yoksa kubbe başkalarının haritasında sonsuza kadar durur. */
  let _sonKirikDamga = 0;
  function kendiKalkaniDusur(kirik) {
    if (!kirik || _sonKirikDamga === kirik) return;
    if (typeof state === "undefined" || !state) return;
    const b = Number(state.kalkanBitis || 0) || 0;
    if (b <= 0) return;        // zaten kalkan yok
    if (b > kirik) return;     // kırılandan SONRA alınmış yeni kalkan — dokunma
    _sonKirikDamga = kirik;
    state.kalkanBitis = 0;
    if (typeof persistCurrentState === "function") persistCurrentState();
    if (typeof window.kalkaniYayinla === "function") window.kalkaniYayinla();
    if (typeof renderBattleMap === "function") renderBattleMap();
    showToast("🛡️ Kalkanın füzeyle kırıldı! Kalen saldırıya açık.", 5000);
  }

  // Fırlatma olaylarını dinle: kim atarsa atsın roket herkeste uçar.
  /* Kendi ekranımızda ZATEN oynatılmış fırlatmaların anahtarları.
     fireMissile dolduruyor, dinleyici burayı görünce olayı atlıyor. */
  const _yerelFuzeler = {};
  let _launchRef = null;
  function listenLaunches() {
    if (!fbReady() || _launchRef) return;
    _launchRef = firebaseDb.ref("pvp_launches").orderByChild("at").startAt(Date.now() - 5000);
    _launchRef.on("child_added", snap => {
      const m = snap.val();
      if (!m || typeof m.at !== "number") return;

      /* Kendi attığımız füze yerelde çoktan uçtu — ikinci kez çizme. */
      if (_yerelFuzeler[snap.key]) { delete _yerelFuzeler[snap.key]; return; }

      const elapsed = Date.now() - m.at;
      const remaining = m.flightMs - elapsed;

      // Füze çoktan varmışsa animasyonu atla; hasar atan tarafta yine uygulansın.
      const sb = Number(m.sb) || 0;   // kalkan kırıcı füze mi

      if (remaining <= 0) {
        if (m.from === myKey) {
          if (sb > 0) kalkanKir(m.target, m.targetName, sb);
          else        applyDamage(m.target, m.targetName);
        }
        cleanupLaunch(snap, m, 0);
        return;
      }

      // Geç bağlanan taraf füzeyi ARA konumdan başlatır → iki ekran senkron.
      const p = Math.max(0, elapsed / m.flightMs);
      const fx = m.fx + (m.tx - m.fx) * p;
      const fy = m.fy + (m.ty - m.fy) * p;

      animateMissile(fx, fy, m.tx, m.ty, remaining, () => {
        if (m.from === myKey) {
          if (sb > 0) kalkanKir(m.target, m.targetName, sb);
          else        applyDamage(m.target, m.targetName);
        }
      }, m.targetName, m.from === myKey, sb > 0);

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
      if (kind === "impact" && _patlamaBlob) {
        const u = URL.createObjectURL(_patlamaBlob);   // ön yüklenmiş kopya: gecikme yok
        img.src = u;
        setTimeout(() => URL.revokeObjectURL(u), 8000);
      } else {
        img.src = src.startsWith("data:") ? src : src + (kind === "impact" ? ("?t=" + Date.now()) : ""); // GIF baştan oynasın (gömülü data URL'ye dokunma)
      }
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

  /* ---------- KONUM: TEK GEÇİT ----------
     YENİ (izometrik) modda harita.js'in ekranKonumu'una, ESKİ modda
     eski yüzde hesabına düşer. Çizim yapan HER yer buradan geçer;
     ikinci bir dönüşüm yazılmaz. */
  function isoHarita() {
    const H = window.HARITA;
    return (H && typeof H.aktifMi === "function" && H.aktifMi() &&
            typeof H.ekranKonumu === "function") ? H : null;
  }

  // Oyun koordinatı (0..COORD_GRID) → sprite'ın CSS konumu.
  // kaldirKare: ekranda kaç kare YUKARI kaydırılsın (izometride dikey).
  function konum(gx, gy, kaldirKare) {
    const H = isoHarita();
    if (H) {
      const p = H.ekranKonumu(gx, gy);
      if (p) {
        const y = p.y - (kaldirKare || 0) * p.kareYuksekligi;
        return { left: p.x + "px", top: y + "px",
                 x: p.x, y: y, zoom: p.zoom, iso: true };
      }
    }
    // ESKİ mod: davranış birebir korunuyor (yüzde, 1 kare = 100/COORD_GRID).
    const px = (gx / COORD_GRID) * 100;
    const py = (gy / COORD_GRID) * 100 - (kaldirKare || 0) * (100 / COORD_GRID);
    return { left: px + "%", top: py + "%", x: px, y: py, zoom: 1, iso: false };
  }

  /* SADECE ESKİ MOD. Patlamayı hedef kale görselinin merkezine oturtur.
     YENİ modda kullanılmaz — orada patlama bir .map-node ve konumunu
     harita.js veriyor (bkz. patlat). */
  function patlamaYerlestir(boom, tx, ty, targetName) {
    const mapEl = document.getElementById("battleMap");
    if (!mapEl) return;
    const kY = konum(tx, ty, VURUS_KALDIR_KARE + (SPRITE.boomLiftCells || 0));
    let bx = kY.left, by = kY.top;
    if (targetName) {
      const node = [...mapEl.querySelectorAll(".castle-node")]
        .find(n => n.dataset.cname === targetName);
      // Kale RESMİNİ bul: bizim eklediğimiz buton ve isim
      // etiketi hariç, alan olarak EN BÜYÜK alt eleman kalenin görselidir.
      let imgEl = node ? node.querySelector("img") : null;
      if (node && !imgEl) {
        let best = null, bestArea = 0;
        node.querySelectorAll("*").forEach(ch => {
          if (ch.closest(".msl-btn")) return;
          const t = (ch.textContent || "").trim();
          if (t && t === targetName) return; // isim etiketi
          const r = ch.getBoundingClientRect();
          const area = r.width * r.height;
          if (area > bestArea) { bestArea = area; best = ch; }
        });
        imgEl = best || node;
      }
      if (imgEl) {
        const mr = mapEl.getBoundingClientRect(), ir = imgEl.getBoundingClientRect();
        if (mr.width && mr.height) {
          const cx = ir.left + ir.width / 2 - mr.left;
          const cy = ir.top + ir.height / 2 - mr.top;
          bx = (cx / mr.width * 100) + "%";
          by = ((cy / mr.height * 100) - (SPRITE.boomLiftCells || 0) * (100 / COORD_GRID)) + "%";
        }
      }
    }
    boom.style.left = bx;
    boom.style.top  = by;
  }

  /* ---------- PATLAMA GIF'İ ÖN YÜKLEME ----------
     Sorun: her patlamada src'ye "?t=" ekliyorduk. Bu, GIF'in baştan
     oynaması için gerekliydi ama sorgu farklı olduğu için tarayıcı
     önbelleği ISKALIYOR ve dosyayı HER SEFERİNDE yeniden indiriyordu.
     Gördüğün yarım saniyelik gecikme o indirmeydi.

     Çözüm: dosyayı açılışta BİR KEZ indirip Blob olarak tut. Her
     patlamada aynı Blob'tan yeni bir object URL üret — URL farklı
     olduğu için tarayıcı yeni bir görsel sayar ve GIF baştan oynar,
     ama veri zaten bellekte olduğu için ağ isteği yok, gecikme yok. */
  let _patlamaBlob = null;
  /* Roket görseli de açılışta bir kez indirilsin: ilk fırlatmada
     dosya inerken roket birkaç kare boş çiziliyordu. */
  function roketOnYukle() {
    const src = SPRITE.rocket;
    if (!src || src.startsWith("data:")) return;
    const im = new Image();
    im.src = src;
  }

  function patlamaOnYukle() {
    const src = SPRITE.impact;
    if (!src || src.startsWith("data:") || _patlamaBlob) return;
    /* Dosya adı adayları sırayla denenir; ilk bulunan SPRITE.impact
       olarak sabitlenir, sonraki patlamalar doğrudan onu kullanır. */
    const adaylar = [src, "fuze_Fuze-patlama.gif", "fuze_fuze-patlama.gif"];
    let i = 0;
    (function dene() {
      if (i >= adaylar.length) return;
      const ad = adaylar[i++];
      fetch(ad)
        .then(r => r.ok ? r.blob() : null)
        .then(b => {
          if (b && b.size > 0) { _patlamaBlob = b; SPRITE.impact = ad; }
          else dene();
        })
        .catch(dene);
    })();
  }

  /* Patlama görselini üretir. olcek: dış kutuya uygulanacak scale —
     görseli onunla bölerek ekrandaki boyutu sabit tutuyoruz. */
  function patlamaGorseli(olcek) {
    const src = SPRITE.impact;
    if (!src) {
      const d = document.createElement("div");
      d.textContent = "💥";
      d.style.cssText = "font-size:" + (64 / olcek) + "px;line-height:1;";
      return d;
    }
    const img = document.createElement("img");
    if (_patlamaBlob) {
      const url = URL.createObjectURL(_patlamaBlob);
      img.src = url;
      setTimeout(() => URL.revokeObjectURL(url), 8000); // belleği bırak
    } else {
      img.src = src.startsWith("data:") ? src : src + "?t=" + Date.now();
    }
    const sz = (SPRITE.impactSize || SPRITE.size) / olcek;
    img.style.cssText = "width:" + sz + "px;height:" + sz + "px;object-fit:contain;display:block;";
    /* YEDEK ZİNCİRİ.
       Eski kod önce img.remove() yapıp SONRA img.parentNode'a emoji
       eklemeye çalışıyordu — remove() ebeveyni kopardığı için
       parentNode null'dı ve ekrana HİÇBİR ŞEY gelmiyordu. Patlamanın
       tamamen kaybolmasının sebebi buydu: dosya bulunamayınca yedek de
       çizilmiyordu.
       Ayrıca dosya adı denemesi: Vercel'de büyük/küçük harf ayrımı var,
       roket dosyası "Fuze" büyük F ile duruyor. Sırayla denenir. */
    const adaylar = [
      SPRITE.impact,
      "fuze_Fuze-patlama.gif",
      "fuze_fuze-patlama.gif",
      "fuzepatlama.gif"
    ];
    let sira = 0;
    img.onerror = () => {
      const ebeveyn = img.parentNode;
      sira++;
      while (sira < adaylar.length && (!adaylar[sira] || adaylar[sira] === img.dataset.son)) sira++;
      if (sira < adaylar.length) {
        img.dataset.son = adaylar[sira];
        img.src = adaylar[sira] + "?t=" + Date.now();
        return;
      }
      img.remove();
      if (ebeveyn) {
        const d = document.createElement("div");
        d.textContent = "💥";
        d.style.cssText = "font-size:" + (64 / olcek) + "px;line-height:1;";
        ebeveyn.appendChild(d);
      }
    };
    return img;
  }

  /* ---------- PATLAMA ----------
     NEDEN BÖYLE:
     Patlamayı kendi rAF döngümüzle konumlandırmak YETMİYOR. harita.js
     kaydırmayı applyMapPan içinde işliyor ve kaleleri ORADA, aynı çağrıda
     dugumleriYerlestir ile yerleştiriyor. Bizim döngümüz ayrı bir sırada
     çalıştığı için doğru değeri ama YANLIŞ ANDA yazıyordu — tam bir kare
     geriden. Döngüyü hızlandırmak bunu çözmez, çünkü sorun sıklık değil
     sıralama.

     Çözüm: patlamayı .map-node yapıp data-cx/data-cy vermek. Böylece
     dugumleriYerlestir onu kalelerle BİRLİKTE, aynı çağrıda, aynı
     matematikle yerleştiriyor. Desenkron olması yapısal olarak imkânsız.
     Bonus: iso katmanındaki "transition:none" ve zoom ölçeği de bedava
     geliyor, derinlik sıralaması (zIndex) da doğru çıkıyor. */
  function patlat(tx, ty, targetName) {
    const m = document.getElementById("battleMap");
    if (!m) return;
    const H = isoHarita();

    if (H) {
      const C = H.CFG || {};
      const olcek = C.dugumOlcek || 0.64;
      const tileH = C.tileH || 32;

      const dis = document.createElement("div");
      dis.className = "map-node msl-boom-node";
      dis.dataset.cx = tx;   // dugumleriYerlestir bunu okur
      dis.dataset.cy = ty;
      dis.style.cssText = "position:absolute;pointer-events:none;" +
                          "width:auto;height:auto;transition:none;";

      /* Yukarı kaydırma: dış kutuya scale(zoom * olcek) uygulanacak.
         Ekranda boomLiftCells * tileH * zoom px yukarı çıkması için iç
         kaydırma (boomLiftCells * tileH) / olcek olmalı — zoom sadeleşir,
         yani bu sayı her yakınlaştırma seviyesinde doğru kalır. */
      const ic = document.createElement("div");
      ic.style.cssText =
        "transform:translateY(" + (-(VURUS_KALDIR_KARE + (SPRITE.boomLiftCells || 0)) * tileH / olcek) + "px);" +
        "pointer-events:none;filter:drop-shadow(0 0 6px rgba(255,140,40,.8));";
      ic.appendChild(patlamaGorseli(olcek));
      dis.appendChild(ic);

      m.appendChild(dis);
      /* ── ÖNBELLEK ZORLA TAZELENSİN ──
         dugumOnbellegi listeyi ÇOCUK SAYISINA bakarak geçerli sayıyor.
         Roket sprite'ı patlamadan hemen önce siliniyor, patlama da hemen
         ekleniyor: sayı DEĞİŞMİYOR, önbellek geçerli kabul ediliyor ve
         patlama listeye hiç girmiyordu. Transform yazılmayınca kutu
         0,0'da (ekranın sol üstünde, yarısı dışarıda) kalıyordu —
         "patlama görünmüyor" bu. */
      if (typeof H.dugumOnbellegiBosalt === "function") H.dugumOnbellegiBosalt();
      H.dugumleriYerlestir();   // ilk konum

      // Sadece renderBattleMap DOM'u silerse geri tak. Konumlandırma
      // artık bizim işimiz değil.
      const bt = setInterval(() => {
        const mm = document.getElementById("battleMap");
        if (mm && !dis.isConnected) {
          mm.appendChild(dis);
          if (typeof H.dugumOnbellegiBosalt === "function") H.dugumOnbellegiBosalt();
          H.dugumleriYerlestir();
        }
      }, 200);
      setTimeout(() => {
        clearInterval(bt);
        dis.remove();
        if (typeof H.dugumOnbellegiBosalt === "function") H.dugumOnbellegiBosalt();
      }, 5000);
      return;
    }

    /* ESKİ mod: #battleMap'e scale() uygulanıyor, sprite yüzdeyle
       konumlanınca haritayla birlikte kayıyor. Davranış değişmedi. */
    const boom = makeSprite("impact");
    m.appendChild(boom);
    patlamaYerlestir(boom, tx, ty, targetName);
    const bt = setInterval(() => {
      const mm = document.getElementById("battleMap");
      if (!mm) return;
      if (!boom.isConnected) mm.appendChild(boom);
      patlamaYerlestir(boom, tx, ty, targetName);
    }, 200);
    setTimeout(() => { clearInterval(bt); boom.remove(); }, 5000);
  }

  /* ── KAMERA TAKİBİ ──────────────────────────────────────────────
     Kendi attığın füze fırlatılır fırlatılmaz kamera onu takip eder.
     Haritaya dokunduğun an takip BIRAKILIR (kontrol sende). Füzeye
     tekrar dokunursan takip yeniden başlar.

     Neden her karede merkezle(): tween kullanılamaz, her kare yeni
     tween başlatır ve kamera titrer. merkezle() anlıktır.
     ─────────────────────────────────────────────────────────────── */
  function takipKur(fly, durum) {
    /* Haritaya dokunma → takibi bırak. Dokunuş füzenin KENDİSİNE ise
       aşağıdaki stopPropagation yüzünden buraya hiç ulaşmaz. */
    const wrap = document.getElementById("battleMapWrap");
    const birak = () => { durum.acik = false; };
    if (wrap) wrap.addEventListener("pointerdown", birak, true);

    /* Füzeye dokun → takibi geri al. Sprite normalde pointer-events:none;
       uçuş boyunca tıklanabilir yapıyoruz. */
    fly.style.pointerEvents = "auto";
    fly.style.cursor = "pointer";
    const yakala = (e) => {
      e.stopPropagation();      // harita bunu "boş yere dokunma" sanmasın
      durum.acik = true;
    };
    fly.addEventListener("pointerdown", yakala);
    fly.addEventListener("click", yakala);

    /* Uçuş bitince dinleyiciyi bırak — birikirse her füzede bir tane
       daha kalır. */
    durum.temizle = () => {
      if (wrap) wrap.removeEventListener("pointerdown", birak, true);
    };
  }

  function animateMissile(fx, fy, tx, ty, durMs, onImpact, targetName, benimMi, patlamasiz) {
    /* Kayıttaki eski -1 kaydırmasını GERİ SÖK. Bundan sonrası ham oyun
       koordinatıdır; yukarı kaydırma ekran uzayında (KALKIS_KALDIR_KARE)
       uygulanır. Böylece hem eski hem yeni sürümün yazdığı kayıt aynı
       yerde çizilir. */
    fy -= KAYIT_OFFSET_Y;
    ty -= KAYIT_OFFSET_Y;

    const getMap = () => document.getElementById("battleMap");
    if (!getMap()) { onImpact(); return; }

    // Uçuş: her karede JS konumlandırır (rAF). Harita yeniden çizilse bile
    // roket kaybolmaz — DOM'dan düştüyse kendini geri ekler.
    const fly = makeSprite("rocket");

    /* Seyir açısı EKRAN uzayında hesaplanır, ızgarada değil.
       İzometride ızgara açısı ekranda eğilir; eski kod ızgara açısını
       kullandığı için roket hedefe bakmıyordu. Pan/zoom uçuş sırasında
       değişebildiği için her karede yeniden hesaplanır. */
    function seyirAcisi() {
      const a = konum(fx, fy, KALKIS_KALDIR_KARE);
      const b = konum(tx, ty, VURUS_KALDIR_KARE);
      return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI -
             (SPRITE.rocketFacing || 0);
    }
    // Düşüş hedef açısı: burnu ekranda tam AŞAĞI göstersin (aşağı = 90° - rocketFacing)
    const diveRot = 90 - (SPRITE.rocketFacing || 0);
    fly.style.setProperty("--msl-rot", seyirAcisi() + "deg");
    const t0 = performance.now();

    /* Takip yalnız KENDİ füzende otomatik açılır. Başkasının füzesine
       dokunursan yine takibe alabilirsin. */
    const takip = { acik: !!benimMi, temizle: null };
    takipKur(fly, takip);

    function step(now) {
      const p = Math.min(1, (now - t0) / durMs); // 0→1 ilerleme
      const gx = fx + (tx - fx) * p;
      const gy = fy + (ty - fy) * p;

      /* SIRA ÖNEMLİ: kamerayı ÖNCE taşı, sprite konumunu SONRA hesapla.
         Ters olursa füze bir kare geride kalıp titrer. */
      if (takip.acik) {
        const HH = isoHarita();
        if (HH && typeof HH.merkezle === "function") HH.merkezle(gx, gy);
      }

      const kaldir = KALKIS_KALDIR_KARE + (VURUS_KALDIR_KARE - KALKIS_KALDIR_KARE) * p;
      const k = konum(gx, gy, kaldir);
      fly.style.left = k.left;
      fly.style.top  = k.top;
      // Roket de kaleler gibi zoom ile ölçeklensin (dugumleriYerlestir mantığı).
      fly.style.setProperty("--msl-scale", k.iso ? k.zoom : 1);

      const cruiseRot = seyirAcisi();
      const diveDiff = normDeg(diveRot - cruiseRot); // en kısa yönden dönüş farkı

      // Düşüş evresi: diveStartAt sonrası burun kademe kademe kırılır.
      // Tam dikeye değil, diveOran kadarına gider — yatık dalış.
      let rot = cruiseRot;
      if (p >= SPRITE.diveStartAt) {
        const t = (p - SPRITE.diveStartAt) / (1 - SPRITE.diveStartAt); // 0→1
        const kademe = Math.max(1, SPRITE.diveSteps || 1);
        const stepNo = Math.min(kademe, Math.ceil(t * kademe));        // 1..kademe
        const hedefFark = diveDiff * (SPRITE.diveOran != null ? SPRITE.diveOran : 0.55);
        rot = cruiseRot + hedefFark * (stepNo / kademe);
      }
      fly.style.setProperty("--msl-rot", rot + "deg");
      const mapEl = getMap();
      if (mapEl && !fly.isConnected) mapEl.appendChild(fly); // harita yenilendiyse geri tak
      if (p < 1) {
        requestAnimationFrame(step);
      } else {
        if (takip.temizle) takip.temizle();
        fly.remove();
        /* KALKAN KIRICI FÜZEDE PATLAMA OYNATILMAZ. Kalkan hasarı
           yutuyor; ekranda patlama görünürse oyuncu kaleyi vurduğunu
           sanır. Roket sessizce söner, kalkan düşer. */
        if (!patlamasiz) patlat(tx, ty, targetName);
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

      /* HP BARI KALDIRILDI. Kalenin altındaki yeşil çubuk isim
         etiketiyle çakışıyordu ve haritada sürekli duran bir bilgi
         olmasına gerek yok — kalenin canı kale kutucuğunda yazıyor.
         pct yalnız "yıkık" eşiği için hesaplanıyor. */

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
  function showMissileConfirm(targetName, onConfirm, kalkanVar) {
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
    msg.textContent = kalkanVar
      ? ("Başkanım! " + targetName + " kalkanını açmış. Füzemiz kaleye zarar veremez, " +
         "yalnızca kalkanı parçalar. Kaleyi vurmak için ikinci bir füze gerekecek. " +
         "Yine de ateşleyelim mi?")
      : "Başkanım! Teknolojik roket sistemlerini kullanmak acımasız bir şekilde rakibe zarar verecektir. Gerçekten kullanmak istiyor musunuz!";

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
    /* kalkanBitis: hedefin kalkanı VARSA bitiş damgası, yoksa 0.
       Hesabı pvp.js yapar (kalkanKalan tek kapı), burada tekrarlanmaz. */
    open: function (targetName, tx, ty, kalkanBitis) {
      if (!fbReady() || !myKey) { showToast("Bağlantı yok, füze atılamaz."); return; }
      if (myMissiles() <= 0) { showToast("Füzen kalmadı! 🚀"); return; }
      kalkanBitis = Number(kalkanBitis) || 0;
      showMissileConfirm(targetName, function () {
        fireMissile(targetName, tx, ty, kalkanBitis);
      }, kalkanBitis > 0);
    },
    // Onaysız doğrudan fırlatma (gerekirse)
    fire: function (targetName, tx, ty, kalkanBitis) { fireMissile(targetName, tx, ty, kalkanBitis); },

    /* ── KIRIK KALKAN DAMGASI ──
       Döner: bu oyuncunun kalkanının füzeyle kırıldığı bitiş damgası
       (ms), yoksa 0. pvp.js kalkanKalan() ve tema.js kubbe tarayıcısı
       buradan sorar; ikinci bir okuma yolu AÇMA.
       pvpData henüz yüklenmemişse 0 döner — yani kalkan AYAKTA sayılır,
       güvenli taraf. */
    kalkanKirikMi: function (name) {
      if (!name) return 0;
      const rec = pvpData[keyOf(name)];
      return (rec && typeof rec.kbKirik === "number") ? rec.kbKirik : 0;
    },
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
      /* z-index: izometrik düğümler derinlik için 10+(gx+gy)*10 alıyor
         (en fazla ~2830). Roket onların ARKASINDA kalmasın diye 5000. */
      .msl-sprite{position:absolute;
        transform:translate(-50%,-50%) rotate(var(--msl-rot,0deg)) scale(var(--msl-scale,1));
        font-size:28px;z-index:5000;pointer-events:none;filter:drop-shadow(0 0 6px rgba(255,140,40,.8));}
      /* PATLAMA HER ZAMAN ÜSTTE.
         Patlama bir .map-node olduğu için dugumleriYerlestir ona kale
         derinliğini (z-index 10+(gx+gy)*10) yazıyordu; hedef kalenin
         ve komşu düğümlerin ARKASINDA kalıp görünmüyordu. Satır içi
         stili ezmek için !important şart. */
      .msl-boom-node{z-index:5000 !important;}
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
        max-width:340px;width:88%;box-shadow:none;
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
        box-shadow:none;}
      .msl-cbtn-ok:active{box-shadow:none;}
      .msl-cbtn-cancel{background:rgba(0,0,0,.12);color:#000;
        box-shadow:none;}
      .msl-cbtn-cancel:active{box-shadow:none;}
    `;
    document.head.appendChild(s);
  }

  /* ---------- BAŞLATMA ---------- */
  // currentUsername login sonrası dolduğu için hazır olana dek bekleriz.
  function boot() {
    injectStyles();
    patlamaOnYukle();
    roketOnYukle();
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
