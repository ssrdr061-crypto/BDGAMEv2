# OKU-BENI-30

**BurstDiamond** — telefon tarayıcısında oynanan çok oyunculu strateji oyunu.
Kale, birlik, kahraman, izometrik harita, PvP/PvE, düğüm, sefer, mağaza.
Arayüz Türkçe (karo=tile, düğüm=node, kale=castle, sefer=march).
Telefonda düzenlenir → Vercel → `bdgam-ev2.vercel.app`. Veri Firebase RTDB'de.

Oyun **kaleiçinde** açılır (`KALEICI.ac()`); haritaya "Haritaya dön" ile geçilir.

## Çalışma kuralları

- Masaüstü yok, konsol yok, zip yok. Tanı çıktısı **ekrana**, `showToast`'a değil.
- **Tam dosya** ver, yama değil. `index.html` dahil.
- `index.html` düzenlendiyse **13 inline bloğu ayrı ayrı** `node --check`.
  Her düzenlemeden sonra fonksiyon adlarını karşılaştır.
- Belirsiz istekte **şıkla sor**. Belge sayısına güvenme, say.
- Serdar yamayı reddeder, **kökü** ister. Belirtiyi kapatan değişiklik çözüm değil.
- **Ezme yok, sil.** Büyük iş ikiye bölünür; ilki çalışmadan ikincisi verilmez.
- Bu kopya Serdar'ın canlı dosyasından eski olabilir — satır numarası vermeden önce doğrula.

## Görünüm kuralı

3B yok: kalın alt kenar, inset kabartı, kalın kontur, radial parlaklık yok.
`box-shadow:0 2px 6px rgba(0,20,45,.3)` · `border:none` veya `1px rgba(190,240,255,.20)` ·
`text-shadow:0 1px 2px rgba(0,20,45,.55)` · basma `scale(.96)`+`brightness(.93)` `.09s`.
Yazı tipi **Baloo 2** (`display=block`, `index.html` en başta). Rakam genişliği eşit
değil → sayaçlarda `font-variant-numeric:tabular-nums`.
Giriş ekranı yalnız `index.html` ~116'dan boyanır.

---

## Tek doğruluk kaynakları

Bir değer nerede yazılıysa **oradan okunur**, ikinci kopya açılmaz.

| Konu | Yer |
|---|---|
| Birlik adı / görsel / kademe | `troops.js` `KADEME_ADI` `KADEME_GORSEL` |
| Taban stat, havuz, final | `istatistik.js` |
| Üstünlük çemberi | `troops.js CEMBER` + `cemberCarpani()` |
| Bina maliyet/süre/kapı kuralı | `insaat.js` |
| Üretim hızı | `uretim.js HIZ` (× `INSAAT.uretimCarpani()`) |
| Kahraman stat bonusu | `heroes.js HERO_STATS` → motor `gelistir.js` |
| Sefer kapasitesi | `gelistir.js TABAN_KAPASITE` + komutan kapasiteleri |
| Kaynak simgesi | `dugum.js KAYNAK` · `troops.js KAYNAK_EMOJI/KAYNAK_IKON` |
| Elmas simgesi | `index.html elmasIkon/ELMAS` + `tema.js elmasSimgeOlcu` |
| Mağaza ürün + haftalık limit | `magaza.js SHOP_ITEMS` / `SHOP_LIMITS` |
| Eğitim zinciri | `egitim.js ZINCIR` |

### Kimlik ≠ ad — KÖK KURAL

`knight` · `soldier` · `robot` kod adı DEĞİL, **Firebase veri anahtarıdır**.
Ad ve görsel serbestçe değişir; **kimlik asla**. Aile adları Savunucu /
Koruyucu / Nişancı'dır; oyuncuya gösterilen hiçbir metinde "robot" geçmemeli.

### Emoji ile görsel iki ayrı bağlam

Düz metin (toast, `textContent`, canvas) → **emoji**.
innerHTML → **görsel**. Karıştırırsan ekranda ham `<img …>` çıkar.
Her simgede `onerror` var, dosya yoksa emojiye döner.
Dosya adları **lowercase ASCII** — Türkçe harf sessiz yükleme hatası verir.

---

## Elmas simgesi (29)

`elmas.webp`. İki ayrı ölçü, çünkü satır içi `<img>` akışta yer kaplar ve
büyütünce satırı da büyütür:

- `.elmas-kutu` → **akışta** yer kaplayan kutu (`--el-kutu`). Satır ve düğme
  boyunu yalnız bu belirler.
- `.elmas-gor` → içinde mutlak konumlu görsel (`--el-boy`). Taşar, ölçüye dokunmaz.

Yer başına ayar: `ELMAS("magaza")` → `class="elmas-kutu ey-magaza"`, her yerin
kendi `.ey-*` kuralı değişkenleri ezer. **Tanım yalnız `index.html`'de.**

**Bağlı dokuz yer:** hud · magaza · insaat (2 düğme) · kahraman · gelistir ·
gunluk · tasima · rehber · canta (CSS `::before`, ayrı yol).

**Bağlanmamış — `textContent` yapısı bölünmeli:** eğitim düğmeleri
(`.utb-cost`/`.utb-inst-cost`) · `#hsmCost` · sandık ödülü · mağaza adet
toplamı · `heroes.js` kartı Satın Al · `sefer.js` hızlandırma penceresi.

---

## Tuzaklar

**Kayıt / veri**
1. `insaat.js` kilitlenmesi: binalar kaleyi **bir seviye** geçebilmeli
   (`hedef <= seviye("kale") + 1`). "Geçemez" dersen oyun ilk yükseltmede ölür.
2. `dugum.js` **tür sırası konumu belirler.** Ortadan tür eklersen sonraki tüm
   düğümler yer değiştirir — yeni tür her zaman SONA.
3. Yerelde buluta yazılmamış değişiklik varken buluttan **çekme**
   (`BULUT_YAZIM_BEKLIYOR`). Yoksa hoş geldin elması saniyeler içinde silinir.
4. Sunucu `accounts/{name}.state`'e **asla** yazmaz → ayrı yol (`seferSonuc/`).
   Firebase `.set()` `undefined` değerleri sessizce reddeder.
5. Bir alan temizlendiği hâlde geri geliyorsa onu **yazan bütün yerleri** ara.
6. Kayıt yazılamayınca oyun sessizce eskiye döner.
7. `compactStateForExport`'a yazılmayan alan her girişte sıfırlanır.
8. `birlikEkle`/`birlikDus` çifti **aynı yolda** kapanmalı; araya `await` giren
   her dalda hata yolu da düşürmeli.

**Arayüz**
9. **Bildirimler kapalı** (`BILDIRIMLER_ACIK = false`) — `showToast` hiçbir şey
   yapmaz. Görünmesi gereken uyarı için `showToastForce`.
10. **Üst düzey `const` `window`'a KONMAZ.** `state` `const` →
    `window.state` hep `undefined`. Aynısı `UNIT_TYPES`,
    `KADEME_GORSEL`, `TROOP_POWER` için de geçerli: başka bir
    dosyadan `window.UNIT_TYPES` diye okursan sessizce `undefined`
    gelir, görseller emojiye düşer, kademe 1 sanılır. Çıplak adla
    oku (`typeof UNIT_TYPES !== "undefined"` ile koru); sözlük
    ortamı dosyalar arasında ortaktır, yeter ki tanımlayan dosya
    önce yüklenmiş olsun. Deneme sayfasında değeri `window`'a
    koyarsan bu hata görünmez — kaleici-57'de tam böyle kaçtı.
11. **`prefers-reduced-motion`** tüm CSS animasyonlarını öldürür → halka/kubbe
    animasyonları `requestAnimationFrame` ile.
12. **`calc(-50% + var(--x))` eksi değerde geçersizdir** — transform'un tamamı
    sessizce düşer. İki ayrı `translate()` zincirle.
13. **`overflow-y:auto` yatayda da kırpar** — köşedeki ✕ kaybolur. Taşan görsel
    de bu yüzden kesilir.
14. **Gizli kapsayıcının ölçüsü 0'dır.** `.unit-screen` `visibility` ile gizlenir,
    `display` ile değil → üçü de ölçülebilir, "görünür ilkini bul" hep
    savunucuyu bulur. Aile adıyla seç: `.unit-screen[data-unit="soldier"].is-active`.
15. **`src` değiştirmek anında değil, sınıf değiştirmek anındadır** → görselleri
    üst üste hazır koy, sınıf aç/kapa.
16. `MutationObserver` callback'i içinde sınıf değiştirmek gözcüyü uyandırır →
    sonsuz döngü, oyun donar. İş kalmadıysa sınıfa dokunmadan çık.
17. **`previousElementSibling` kırılgandır** — araya dinamik öğe girince zincir
    kopar. Kapsayıcıdan `closest()` ile ara. Bu kalıp iki kez ısırdı.
18. `background` kısayolu satır içi arka plan görselini siler →
    `background-color` + `-image` ayrı.
19. `position:fixed` → `offsetParent` `null`; `offsetWidth` kullan.
20. `inset:0` genişlik/yüksekliği yutar → ölçüm için `right:auto; bottom:auto`.
21. Hayalet tıklama: `pointerup` ile açılan pencere kendi kendine basılır →
    ilk 350 ms `pointer-events:none`.
22. Şeffaf katman altındaki düğmeye basılmaz → `pointer-events:none`.
23. **`textContent` ile tazelenen alana görsel konamaz** — ilk güncellemede
    silinir. Önce kutu + değer `<span>`'i olarak ikiye böl.
24. **Tanı panelini ✕ ile DOM'dan silme**, gövdesini topla — yoksa geri açmanın
    tek yolu sayfayı yenilemek olur.
25. Ekran görüntüsü ölçüm aracıdır; bu telefonda ölçek **2×**.
    **7 piksel "değişmedi" demektir** — ölç, tahmin etme.
26. Panel sığmıyorsa önce dolguları say, kaydırma ekleme.
27. Şablon dizgisi içindeki yoruma ters tırnak koyma.
28. `parseInt(ctx.font)` `"700 12px"` için 700 döner.

**Harita / savaş**
29. **`DUGUM` karo verir (0–141), `HARITA.merkezle` grid bekler (0–30)** —
    `ORAN` (≈4,7) ile böl.
30. Zemin ve düğümler aynı karede çizilir → `applyMapPan` → `kareIste()`.
31. Arka plana atılan tarayıcı "parmak kalktı" demez → `visibilitychange`/
    `pageshow`/`blur`'da parmak sayaçlarını sıfırla.
32. Hasarı sırayla uygulamak sondakini aç bırakır → 12 dilim.
    Hasar buff'ını toplam hasara değil **kaynak paylarına** uygula.
33. Çemberde hasar çarpılmaz, **birim canının maliyeti bölünür** (`hp/carpan`).
34. Rapor verisini `savasBitti()`'den **önce** topla.
35. Kahraman yıldızı yalnız `statlar.*.seviyeler` haritasından okunur
    (`{heroId: sv}`); yazılmazsa yıldız hiç çizilmez.
36. Sabit ihtimali `effect` **içine** yaz (`chance: 30`); düz `chance` alanı
    sessizce düşer, motor %100 uygular.
37. Kıyasa **sayı** geçir, biçimlenmiş metin değil (`"+%20" < "+%9"`).

**CSS ezme**
38. `tema.js`'te 29+ `<style>` enjeksiyonu var, bazıları gecikmeli → **sonra
    eklenen kazanır**. "Düz açılıp bir saniye sonra kabartmanın dönmesi" budur.
    Ezen kural yazmadan önce elementin asıl tanımına bak.
    Teşhis sırası: aynı seçici `!important` mı → kural sonradan mı ekleniyor →
    ölçü 0 mı.

---

## Geçici tanı bayrakları — iş bitince SİL

`?olcum=1` `?elmasayar=1` `?kaleayar=1` `?dagayar=1` `?ikonayar=1` `?menu=1`
`?ayar=1` `?etiket=1` `?fps=1` `?tani=1` `?dugum=1` `?sefertani=1`
`?egitimtani=1` `?egitimayar=1` `?egitimodul=1` `?birlik=1` `?zaman=1` `?temizle=1`
Kaçış: `?egitimkapat=1`.

## 30'da yapılanlar

- **ŞEF PROFİLİ + ÜST SAĞDA FOTOĞRAF ÇERÇEVESİ** (yeni dosya
  `profil.js`, `index.html`e tek `<script>` + alt menüden bir satır
  yorum). Üstteki 👤 emojisi kalktı, yerine oyuncunun kendi
  fotoğrafını yükleyebildiği çerçeve geldi; çerçeveye dokununca
  referanstaki "Şef Profili" ekranı açılıyor.

  - **SIRALAMA ALT MENÜDEN ÇIKTI, İŞLEV DEĞİŞMEDİ.** `#panel-rank`
    ve onu dolduran kodun tamamı yerinde; yalnız KAPI değişti,
    artık profildeki "Liderlik Tablosu" düğmesi açıyor. Alt menü
    6 → **5 düğme**. Eski satır `index.html`de yorum olarak duruyor,
    geri koymak tek hamle.
  - **ÇIKIŞ ONAYI KAYBOLMADI:** üst şeritteki düğmenin eski işi
    profildeki **Ayarlar**a taşındı (`showLogoutConfirm`).
  - **İKİ KÖK, İKİSİ DE ÖLÇEREK BULUNDU:**
    (1) Dinleyiciyi düğmenin ÜSTÜNE koymak yetmiyor — bir öğenin
        kendi dinleyicileri yakalama/köpürme farkı gözetmeden
        BAĞLANMA SIRASINA göre çalışır; `index.html` aynı düğmeye
        daha önce bağlandığı için sonradan yazılan
        `stopImmediatePropagation` ona yetişemiyor. Kapı `document`ın
        yakalama evresine alındı.
    (2) Olay "click" DEĞİL: `safeBind`, PointerEvent varsa
        **pointerup** bağlıyor. Yalnız click'i durdurunca çıkış
        penceresi yine açılıyordu; ikisi birden durduruluyor.
  - **DEĞERLER MEVCUT KAPILARDAN:** güç `computePlayerPower(state)`
    (sıralamanın okuduğu aynı işlev) · seviye `kaleSeviyesi()` ·
    ittifak `ITTIFAK.benim()` · şerit `state.stamina` (üst şeritteki
    aynı sayaç) · ad `currentUsername` + ittifak etiketi. İkinci
    hesap açılmadı.
  - **OLMAYAN ALAN UYDURULMAZ:** oyunda "Öldürme" ve "Eyalet" yok,
    "Görünümler" ekranı da yok. Satırlar referanstaki yerlerinde
    duruyor ama **sönük ve "—"** ile — Nitelikler ekranındaki
    HIZ/YÜK ile aynı kalıp. Veri yazıldığı gün burada hiçbir şey
    değişmeden dolarlar.
  - **FOTOĞRAF STATE'E YAZILMAZ.** `localStorage bdProfilFoto_<hesap>`:
    (a) Tuzak 7 — `compactStateForExport`a girmeyen alan her girişte
    sıfırlanır, girseydi de her kayıtta buluta yüz kilobayt taşırdı;
    (b) fotoğraf oyunun verisi değil, o telefonun tercihi.
    Yüklenen dosya canvas ile **kare kırpılıp 256px**'e küçültülüp
    JPEG olarak saklanıyor — ham dosya megabaytlarca olabilir ve
    localStorage dolunca oyunun KAYDI da yazılamaz (Tuzak 6).
    Depo dolarsa sessiz kalmaz, `showToastForce` ile söyler (Tuzak 9).
  - Renkler yine `tema.js` `--km-*` değişkenlerinden; simgeler satır
    içi SVG (emoji yok), fotoğraf yokken kutuda ince kişi çizimi
    duruyor — ilgisiz bir oyun görseli konmadı.

  Ölçüldü (412×820 ve 360×740, 2×): alt menü **5 düğme**,
  `#rankDockBtn` yok · üst şeritte çerçeve **22×22**, 👤 emojisi
  ekranda yok · profil **tam ekran** (412×820 / 360×740) · altı
  satır doğru değerlerle ("Güç 49.000", "Kale Sv. 1", "Öldürme —",
  "İttifak —", "Eyalet —") · dayanıklılık şeridi 1000/1000 · dört
  düğmede yazı taşması **0** · "Liderlik Tablosu" `#panel-rank`i
  açıyor ve profil kapanıyor · çıkış penceresi kendiliğinden
  açılmıyor · sayfa yatay kaydırması **0** · konsolda hata yok.
  `index.html`in dört satır içi JS bloğu ayrı ayrı `node --check`
  edildi, `tuzak27.py` temiz.

  **GERİ DÖNÜŞ:** `index.html`den `<script src="profil.js">` satırını
  sil (👤 emojisi ve çıkış onayı geri gelir) ve alt menüdeki sıralama
  düğmesinin yorumunu aç.

- **KALKAN ROZETİ + SÜRE PENCERESİ** (yeni dosya `kalkanrozet.js`,
  `index.html`e tek `<script>` satırı). Serdar referans oyundan
  getirdi: kalkan açıkken üst şeridin altında sol köşede küçük bir
  kalkan düğmesi duruyor, dokununca "Şehrini saldırılardan korur"
  + kalkan satırı + geri sayım açılıyor.

  - **İKİNCİ SÜRE HESABI AÇILMADI.** Kalan süre `window.kalkanKalanMs()`
    (index.html) — haritadaki kubbe (`tema.js`), saldırı kilidi
    (`pvp.js`) ve sefer varışı da aynı kapıdan soruyor. Biçim de
    kendi kopyası değil, `saatBicim()` (00:00:00, `tabular-nums`).
    İkisi de yoksa rozet çizilmez / süre "--:--:--" kalır.
  - **YER ÖLÇÜLEREK BULUNUYOR, sabit `top` YAZILMADI.** Üst şeridin
    boyu sabit değil: `guchud.js` güç satırını, `tema.js` şeridin
    kendisini ayar panelinden büyütüp küçültüyor. Rozetin üstü her
    saniye `.hud-top`un ölçülen alt kenarından türetiliyor.
    Kaleiçindeki "← Haritaya dön" (`#kaleiciKapat`) soldaki AYNI
    sütunda: rozet ona binmesin diye o düğme görünürken 4px boşlukla
    üstüne çekiliyor. Tuzak 19/20 gereği `getBoundingClientRect`.
  - **ÇİZİLMİŞ ÇERÇEVE KALDIRILDI — hızlandırma kutucuğundaki aynı
    kök.** İlk hâlde rozet mavi zeminli kutuydu; `kalkan.webp`in
    KENDİ koyu çerçevesi var (902×902 kare), iki çerçeve üst üste
    biniyordu. Kutu `background:none; border:none` oldu, kare görsel
    kare kutuyu `contain` ile tam dolduruyor. Gölge de kutuya değil
    GÖRSELE veriliyor (`drop-shadow`): zemin saydam olduğu için
    `box-shadow` görselin köşesine uymayan bir dikdörtgen çizerdi.
  - **PANEL AÇIKKEN ROZET GİZLENİR — z-sırasına güvenmek yetmedi.**
    Rozet z=41, paneller z=50, ama ölçtüğümde rozet çantanın ÜSTÜNDE
    kalıyordu (paneller farklı kaplarda). Sayıyla yarışmak yerine
    açık panel doğrudan soruluyor (`.overlay-panel.active` +
    `#battleArena`). Kaleiçi tuvalinin (z=30) üstünde kalmaya devam
    ediyor.
  - Pencere zemini çanta/mağaza baloncuğuyla AYNI
    (`rgba(233,246,255,.96)`) — üçüncü bir pencere dili açılmadı.
    Dışarı dokunmak kapatır; Tuzak 21 gereği ilk 350 ms hayalet
    tıklamaya kapalı. Tuzak 11 gereği CSS animasyonu yok.
  - **REFERANSTAKİ "Şehir Bonusu" DÜĞMESİ YAPILMADI:** oyunda şehir
    bonusu sistemi (Savaşlar / Büyüme sekmeleri, dokuz bonus satırı)
    hiç yok; boş bir düğme koymak yerine ayrı bir iş olarak bırakıldı.
  - **Doluluk çubuğu da yok, bilerek:** `state.kalkanBitis` yalnız
    BİTİŞ damgasını tutuyor, başlangıç yazılmıyor — oran hesaplamak
    için ikinci bir alan (ve Tuzak 7 gereği `compactStateForExport`
    bakımı) gerekirdi. Süre rakamla yazıyor.

  **İKİNCİ TUR — ROZET KÜÇÜLDÜ + BEYAZ İNCE ÇERÇEVE.** 30 → **21px**
  (%70), çerçeve kutunun kendi `border`ı: 1,5px beyaz, `box-sizing:
  border-box` olduğu için dış ölçü BOY'u aşmıyor, görsel kenarın
  altına girmiyor. Köşe ve punto da BOY'dan türetiliyor — tek sayı
  değişince yerleşim kendiliğinden düzeliyor, ikinci yerde piksel
  düzeltmesi yok.

  Ölçüldü (412×820 ve 360×740, 2×): rozet **21×21**, sol kenardan
  10px, üst şeridin **4px** altında, "Haritaya dön" düğmesinin
  **12,5px** üstünde (binme 0) · pencere 274×92,9, rozetin 8px altında,
  sağdan taşma yok, sayfa yatay kaydırması **0** · sayaç işliyor
  (07:53:57 → 07:53:55) · dışarı dokunuş kapatıyor · çanta açılınca
  rozet gizleniyor, kapanınca geri geliyor · kalkan bitince rozet de
  pencere de kayboluyor. `index.html`in dört satır içi JS bloğu ayrı
  ayrı `node --check` edildi, `tuzak27.py` temiz, fonksiyon adları
  birebir aynı (index.html'e yalnız `<script>` satırı eklendi).

  **ÜÇÜNCÜ TUR — ŞEHİR BONUSU EKRANI.** Pencereye **"Şehir Bonusu"**
  düğmesi kondu; tam ekran liste açıyor: **Savaşlar** (8 satır) ve
  **Büyüme** (3 satır) sekmeleri, referanstaki sıra ve metinlerle.

  - **YALNIZ KALKAN GERÇEK.** Tablo tek yerde (`BONUS` dizisi);
    `aktif:true` olan tek satır Kalkan ve süresi rozetle AYNI kapıdan
    (`kalkanKalanMs` + `saatBicim`) geliyor. Diğer on satır **"Yakında"**
    yazıyor, soluk çiziliyor ve HİÇBİR ETKİ UYGULAMIYOR — sahte bonus
    yok. Bir bonus gerçekten yazıldığı gün o satıra `aktif:true`
    yazmak yeter, ekranda başka yer değişmez.
  - **GÖRSEL UYDURULMAZ — bu bir kez yapıldı ve geri alındı.** İlk
    turda satırlara oyunun ilgisiz dosyaları (perdeleme, topcu,
    sovalye…) ikon diye atanmıştı; Serdar reddetti, haklıydı: o
    çizimler o bonusu anlatmıyor. Artık YALNIZ Kalkan'ın görseli var
    (`kalkan.webp` — gerçek eşyanın kendisi), kalan on satırda kutu
    BOŞ çerçeve olarak duruyor. O bonusun kendi çizimi geldiği gün
    satıra `gor:"dosya.webp"` yazmak yeter.
  - **RENK TEMADAN OKUNUR, KOPYALANMAZ.** İlk turda panele elle
    `#0f3252` yazmıştım; oyunun temasıyla tutmuyordu. Ekran artık
    `tema.js koyuMaviTema` bloğunun `--km-1/2/3` + `--km-yazi`
    değişkenlerinden besleniyor — çanta ve marketin gövdesiyle aynı
    üç duraklı gradyan. Sekme ölçüleri de çantanın `.inv-tab`
    kuralıyla aynı (11,5-12,5px, köşe 10px 10px 0 0, seçili
    `rgba(233,246,255,.95)` / `#134a86`). Tema değişirse bu ekran da
    kendiliğinden döner; ikinci palet açılmadı.
  - **Kaydırma yalnız listede** (Tuzak 13: kapsayıcıya `overflow`
    vermek yatayda da kırpar). Başlık ve sekmeler sabit — çanta/market
    kalıbının aynısı, üçüncü bir panel dili açılmadı.
  - Ekran açıkken rozet gizleniyor, geri okuyla çıkınca dönüyor.

  Ölçüldü (412×820 ve 360×740, 2×): ekran **tam ekran** (412×820 /
  360×740) · Savaşlar 8 kart, Büyüme 3 kart · kartların hepsi aynı
  ende (388 / 336) · on bir görselin hepsi yükleniyor · yazı taşması
  **0** · sayfa yatay kaydırması **0** · Kalkan satırı sayıyor
  (07:53:56) · geri okuyla ekran kapanıp rozet geri geliyor.

  **GERİ DÖNÜŞ TEK HAMLE:** `index.html`den
  `<script src="kalkanrozet.js"></script>` satırını sil — rozet,
  pencere ve Şehir Bonusu ekranı birlikte gider.

  **ÖLÇÜM NOTU — eğitim kilidi tıklamayı yutuyor.** Rozete Playwright
  ile basınca hiçbir şey olmuyordu; sebep rozet değil, `egitim.js`
  `kilitKur()`: rehberlik sürerken ışıklı yer dışındaki HER tıklama
  yakalama evresinde `stopPropagation` ile susturuluyor. Ölçüm
  sayfasında `EGITIM.egitimiBitir()` çağrılmalı; `?egitimkapat=1`
  tek başına yetmiyor (giriş sonrası zincir yeniden kuruluyor).

- **KADEME ROZETİ ALTIGEN OLDU** (`tema.js` `temaKademeAltigen`).
  Bölüm 4'te "riskli" diye bırakılmıştı; Serdar denememi istedi,
  iki engel de çözüldü:
  - **`clip-path` ÇOCUKLARIN HEPSİNİ keser — kenarlık dahil.**
    Bu yüzden kenar `border` ile değil, kutunun kendi zemininden
    2px'lik bir HALKA olarak veriliyor: dıştaki altıgen (kutu)
    halka rengi, içteki altıgen (`::before`, 2px içeri) kademe
    arka planı. İkisine de AYNI çokgen yazılıyor (tek `const`),
    ayrışırsa halka kenarlarda tutmaz.
  - **Kademe arka plan görselleri** (`birlik1..5arkaplan.webp`)
    ve %200 ölçekli çizim olduğu gibi duruyor; kırpmayı artık
    `overflow` değil `clip-path` yapıyor, o kurallara dokunulmadı.
  - Seçili rozet: halka altın + 2px yukarı. **Dış parlama YOK** —
    hem görünüm kuralı, hem de `clip-path` `box-shadow`u zaten
    keserdi.
  - **İki deneme geri alındı, ikisi de ölçülerek:** (1) görseli
    yukarı çekmek (`margin-top:-12%`) kaskın altını kesiyor ve
    yüzü rakamın arkasına sokuyor — kare kutudaki kadraj (-4%)
    altıgende de en iyisi. (2) Rakamı alt ORTAYA almak yüzü
    kapatıyor; sağ alta alındı, altıgenin sağ alt eğimi yüzün
    dışında kalıyor.

  Ölçüldü (412×820 ve 360×740): altı rozet de **37,8×42,4** ve
  birbirinin aynı, hepsinde çokgen kırpma etkin, adet ile kaynak
  kutusu arası 8px, yatay kaydırma yok.

  **GERİ DÖNÜŞ TEK HAMLE:** `temaKademeAltigen` IIFE'sini sil —
  rozetler yuvarlak köşeli kareye döner, başka hiçbir yer etkilenmez.

  **ÖLÇÜM ARACI NOTU:** sınav sayfası CSS'i dosyadan düz metin
  olarak topluyordu, şablon dizgisindeki `${SABIT}` yerleri
  dolmuyor ve `clip-path` sessizce geçersiz kalıyordu — altıgen
  "hiç uygulanmadı" gibi görünüyordu. Araç artık `const` değerlerini
  dosyadan okuyup yerine koyuyor ve dolduramadığı yer kalırsa uyarıyor.

- **BİRLİK EKRANI — BÖLÜM 4: AKICILIK · BİTİR'DE GÜÇ ŞERİDİ ·
  KADEME ŞERİDİ.** Hiçbir şey silinmedi; üç ekleme.

  - **"Bitir"e hızlı basınca donma.** Her dokunuşta üç iş birden
    çalışıyordu: (1) `renderTroopsPanel` + `renderUnitStats` (üç
    ekranı da yazar), (2) BÜTÜN hesap nesnesinin JSON'a çevrilip
    localStorage'a yazılması, (3) bulut yazımının kuyruğa alınması.
    Üçü de basış sayısıyla doğrusal büyüyor.
    İki yardımcı eklendi, ikisi de mevcut işlevleri ÇAĞIRIR:
    · **`bdTekCizim(ad, fn)`** — aynı kare içinde kaç kez
      çağrılırsa çağrılsın işi bir kez çalıştırır
      (`requestAnimationFrame`). Çizim ATLANMAZ, tekrarlar
      birleşir. `trainUnitInstant`, `trainUnit` ve birlik
      ekranındaki iki düğme bunu kullanır.
    · **`bdKaydetYakinda()`** — kaydı 500 ms sessizliğe erteler.
      Kayıt İPTAL EDİLMEZ: panel kapanınca (`closeOverlayPanel`),
      sayfa arkaya atılınca (`visibilitychange`) ve sayfadan
      çıkarken (`pagehide`) bekleyen kayıt HEMEN yazılır
      (`bdKaydetSimdi`). Tuzak 3/6 gereği üç ayrı boşaltma kapısı
      var. `persistCurrentState`e DOKUNULMADI, oyunun geri kalanı
      eskisi gibi anında yazmaya devam ediyor.
  - **BİTİR'de de "Güç +N" şeridi.** Eğitim teslimatındakiyle AYNI
    kapı (`gucefekt.js GUC_EFEKT.goster`). Güç, sıralamanın okuduğu
    `TROOP_POWER` tablosundan gelir; tablo henüz tanımlı değilse
    birliğin kendi `power` alanına düşülür — `egitimPartiOzet` ile
    birebir aynı kalıp, ikinci bir güç hesabı açılmadı.
  - **Kademe şeridi:** numaralar **roma rakamı** (I…VI) ve SEÇİLİ
    kademenin **altında elindeki adet** yazıyor (`state.troops`tan,
    ikinci sayaç yok).
    **İKİ DENEME TUTMADI, kökleri şunlar:** (1) adet kutunun içine
    mutlak konumla konunca kutunun `overflow:hidden`ı onu kırpıyor;
    açınca da %200 ölçekli kademe görselleri bütün ekrana taşıyor.
    (2) Kırpmayı görselin sarmalına alınca bu sefer yüzdeli konum
    tutmadı: kutu ölçüsü `--tp-box` ile değişiyor (44 → 37,8) ve
    genel `.uv-portrait span` kuralı adet yazısına da
    `width/height:100%` veriyordu.
    **Tutan yol:** kutu ve adet dikey bir YUVANIN (`.kp-yuva`)
    içinde, ikisi de akışta. Kutuya hiç dokunulmuyor.
    Ölçüldü (412×820 ve 360×740): altı kutu aynı hizada, adet
    kutunun 5px altında, kaynak kutusuyla arası 8px, çakışma yok,
    yatay kaydırma yok.

  **Altıgen kademe rozeti YAPILMADI — sebebi:** kutucukların
  arka planı kademeye göre ayrı görsel (`birlik1..5arkaplan.webp`)
  ve kademe çizimleri %200 ölçekli kırpılıyor; `clip-path` ile
  altıgene çevirmek hem bu arka planları hem çizimin kenarlarını
  keser. Ayrı bir karar olarak bırakıldı.

- **BİRLİK EKRANI — BÖLÜM 3: SÜRGÜ HİZASI, ALT SEKMELERİN BİÇİMİ,
  YAN DÜĞME ÖLÇÜSÜ.**

  - **Sürgü tutamağı raydan aşağı taşıyordu ve −/+ ile aynı hizada
    değildi. KÖK yine TUZAK 38:** dosyada DAHA SONRA gelen
    "ADET ÇUBUĞU: − / kutu / + ortada, sürgü kendi satırında"
    bloğu eski düzeni geri koyuyordu (`flex-wrap`, `order:9`,
    sürgü `height:20px`, `uq-btn` 30px, `uq-input` 52px). Referans
    düzeni tek satır olduğu için o ölçüler **silindi** — tek kaynak
    yukarıdaki referans bloğu. Ayrıca sürgünün KUTUSU tutamak kadar
    yükseğe çıkarıldı (24px) ve rayın ortasına oturtuldu; kutu
    14px iken Chrome 24px'lik tutamağı kutunun üstünden çiziyordu.
    Ölçüldü: sürgü kutusunun merkezi **678,0**, rayın merkezi
    **678,0** — fark 0.
  - **Alt sekmeler kutucuk değil.** Referansta ekranın altına
    YAPIŞIKLAR ve yalnız üst köşeleri yuvarlak. Dört köşesi
    yuvarlak, altında boşluk olan kartlardı. Telefonun çene payı
    artık çubuğa değil sekmenin KENDİ dolgusuna ekleniyor — çubuğa
    eklenince sekmenin altında zemin renginde bir şerit kalıyor ve
    yapışıklık bozuluyordu.
    Ölçüldü (412×820 ve 360×740): sekmelerin alt kenarı ekranın
    alt kenarıyla **birebir aynı** (820 / 740), köşe
    **14px 14px 0 0**, seçili sekme 5px daha uzun (59,2 / 54,2),
    hiçbirinde yazı taşması yok.
  - **☰ ve ⬆ küçüldü:** 42×42 → **36×36**, simge 23 → 19px.
    Kademe şeridine binme yok (şeridin 14px üstünde).

- **BİRLİK EKRANI — BÖLÜM 2: EMOJİ TEMİZLİĞİ, KAYNAK KUTUSU,
  SÜRGÜ, DÜĞMELER.** Serdar Bölüm 1'i reddetti; altı şikâyetin her
  biri ayrı bir kökten geliyordu.

  1. **EMOJİ YASAK — bu ekranda hiç yok artık.** Statlar, sekmeler
     ve yan düğmeler emoji taşıyordu. Hepsi satır içi **SVG** oldu
     (`index.html` `SIM` tablosu, tek kaynak): tek renk
     (`currentColor`), düz çizim, kabartı yok. Aile sekmelerinin
     simgesi ise oyunun kendi rozet görselleri
     (`UNIT_ROLES.rozet` → `rozet-savunucu/koruyucu/nisanci.webp`).
     Dosya açılmazsa görsel **gizlenir**, emojiye DÜŞMEZ.
     Ölçüldü: ekranda kalan emoji sayısı **0**.
  2. **Üç sekmede de "Kışla" yazıyordu — KÖK YÜKLEME SIRASI.**
     `kislaAdi()` adı `window.INSAAT.ADLAR`dan okuyor, ama
     `insaat.js` `index.html`in SONUNDA yükleniyor (satır ~10892)
     ve sekme çubuğu panel kurulurken yazılıyordu → her seferinde
     "Kışla" yedeği. Ad artık **her çizimde** `syncKamp()`ta
     yazılıyor: Savunucu / Koruyucu / Nişancı Kışlası.
  3. **Yan düğmeler kademe kutucuklarının üstüne biniyordu.**
     Kök: viewer'a bir kez eklenip `top:54%` ile konumlanıyorlardı;
     yüzde, stat bloğunun yüksekliğiyle kaymaz. Artık `.stats`ın
     İÇİNDELER ve `bottom:100%` ile onun üstünde dururlar — her
     ekran boyunda kademe şeridinin üstünde kalırlar.
     Ölçüldü: iki ekran boyunda da şeridin **14px üstünde**, binme 0.
  4. **Kaynak kutusu referansa benzemiyordu.** Tek satır simge +
     gereken miktar yazıyordu. Artık iki sütunlu kutu ve her
     hücrede **elindeki / gereken** (`1,0M/2.784`). Elindeki
     kısaltılır, gereken tam yazılır; yetmeyen kaynakta yalnız
     ELİNDEKİ kırmızı olur.
  5. **Sürgü.** Tarayıcının kendi rayı (`accent-color`) iki yanı
     aynı renk çiziyordu ve sürgü ayrı satıra düşüyordu. Artık tek
     satır: **− · ray · + · adet kutusu · en çok**. Ray kendi
     zeminini boyuyor (dolu yeşil, kalanı koyu), oran JS'ten
     `--dolu` ile geliyor, tutamak referanstaki gibi beyaz kulp.
     **TUZAK (ölçerek bulundu):** değişken önce SÜRGÜYE yazılmıştı,
     gradyan ise RAYIN kuralı — CSS değişkeni yalnız aşağı doğru
     geçtiği için dolgu hiç çizilmiyordu. Ray'a yazılıyor.
  6. **Düğmeler.** "⚡ Anında / Üret ×N" → **BİTİR** (turuncu,
     elmas) ve **EĞİT** (mavi, saat + süre). "×N" kalktı, adet
     zaten kutuda yazıyor (`.utb-qty` kaldırıldı, onu tazeleyen
     kod korumalı olduğu için dokunulmadı).

  **`tuzak27.py` BENİ İKİ KEZ KORUYAMADI — denetimin kendisinde kök
  açık vardı.** Düzenli ifade `textContent = \`(.*?)\`;` ile şablonun
  tamamını yakalamaya çalışıyordu; yorumun içindeki ters tırnak
  şablonu ERKEN bitirdiği için blok kısa kesiliyor ve aranan yorum
  hiç görünmüyordu — yani aradığı karakter tam da aramayı
  bozuyordu. Betik yeniden yazıldı: şablonun başından itibaren
  karakter karakter ilerliyor, CSS yorumunun içindeyse ters tırnak
  HATA, dışındaysa şablonu bitirir. Bilerek bozulmuş kopyayla
  sınandı, ikisini de yakaladı.

  Ölçüldü (412×820 ve 360×740, 2×): ekranda emoji 0 · sekme adları
  doğru ve hiçbirinde taşma yok · yan düğmeler kademe şeridinin
  14px üstünde · kaynak kutusu üç hücre, taşma yok · sürgü dolgusu
  %39,4 çiziliyor · Eğit satırı ile sekme çubuğu arası 5,8px ·
  Nitelikler açıkken kaynak + adet + Eğit gizli, yedi satır
  görünür · sayfa yatay kaydırması yok. `index.html`in dört satır
  içi JS bloğu ayrı ayrı `node --check` edildi. Fonksiyon adları
  karşılaştırıldı: `sim` eklendi, `yanDugmelerKur` →
  `yanDugmelerHTML` (yeri değişti), silinen yok.

- **BİRLİK EĞİTİM EKRANI REFERANS DÜZENİNE GEÇİYOR — BÖLÜM 1**
  (`index.html` TroopViewer + `renderUnitStats` · `troops.js` ·
  `tema.js` `temaBirlikReferans`). Serdar başka bir oyundan iki
  ekran görüntüsü getirdi. Büyük iş olduğu için ikiye bölündü;
  bu bölüm **ALT SEKMELER + YAN DÜĞMELER + NİTELİKLER**.

  - **Alt kamp sekmeleri.** Üç aile de her zaman ekranın altında;
    seçili olan beyaz zeminli ve bir tık yukarı çıkık. Sıra ve
    simge `troops.js UNIT_ROLES`tan, ad `kislaAdi()`nden gelir
    (insaat.js `ADLAR`) — dördüncü bir aile listesi açılmadı.
    **KAPI BİLEREK `aileAc()`:** `go()` KIŞLA KİLİDİ'nde erken
    dönüyor, yani kışladan girildiğinde sekmeler sessizce ölü
    kalırdı. `aileAc` kilidi aşan tek yol. **YAN ETKİ:** artık
    kışladan girince de öbür kampa geçilebiliyor — kilit yalnız
    kaydırmayı ve okları bağlıyor.
  - **Sağda iki düğme:** ☰ Nitelikler · ⬆ Terfi. Nitelikler
    açıkken ☰ geri okuna (↩) döner; ikinci bir kapatma düğmesi
    konmadı.
  - **⬆ terfi TUZAK 10 + TUZAK 9 birlikte ısırırdı.** Terfi
    penceresi `troops.js`te `TroopTabs` IIFE'sinin İÇİNDE
    (`upgrade`) ve `TroopTabs` üst düzey `const` — `window`a
    kendiliğinden çıkmıyor. Dışa açıldı (`window.TroopTabs`) ve
    `upgrade` döndürülen nesneye eklendi. Ayrıca `upgrade`in üç
    uyarısı (`asker yok` · `en üst kademe` · `kaynak yetmiyor`)
    `showToast` ile veriliyordu, bildirimler kapalı olduğu için
    düğme o üç durumda **hiçbir şey yapmamış gibi** görünürdü →
    `showToastForce`. Düğme SEÇİLİ KADEMENİN kimliğiyle çağırır
    (`aktifId`), aile kimliğiyle değil.
  - **Nitelikler ekranı:** yedi satır, çubuklu, iki sütun.
    Ana ekrandaki dört stat kutusu (`stats-grid`) **kaldırıldı**,
    değerler buraya taşındı. Tek kaynak `NITELIK` tablosu;
    değer `UNIT_TYPES`taki alandan okunur, ikinci stat tablosu
    yok. Çubuğun tavanı sabit değil, o alanın bütün birliklerdeki
    en büyük değeri (`nitelikTavan`) — kademe sayıları değişince
    çubuklar kendiliğinden doğru kalır.
    **HIZ ve YÜK oyunda YOK** (Serdar "sonra eklerim, boş bırak"
    dedi): alan tanımlı olmadığı için satır sönük ve "—" ile
    çizilir. `troops.js`e `hiz`/`yuk` yazıldığı gün burada hiçbir
    şey değiştirmeden dolarlar.

  Ölçüldü (412×820 ve 360×740, 2×): alt çubuk **53,2px**, üç sekme
  eşit (129,3 / 112), seçili sekme 5px yukarıda ve 5px uzun,
  hiçbirinde yazı taşması yok · yan düğmeler 46×46, sağ kenardan
  10px · "Eğit" satırı ile sekme çubuğu arası **12,8px**, çakışma
  yok · Nitelikler açıkken 7 satır, adet ve Eğit çubuğu gizli,
  kademe şeridi ekranda, taşma yok · sayfa yatay kaydırması yok.
  `index.html`in dört satır içi JS bloğu ayrı ayrı `node --check`
  edildi (dördü de geçti). Fonksiyon adları karşılaştırıldı:
  yalnız ekleme var, silinen yok.

  **BÖLÜM 2 (sırada):** altıgen kademe rozetleri + roma rakamı +
  seçilinin altında adet · kaynak kutusu 2×2 (elindeki/gereken) ·
  Bitir/Eğit düğmelerinin referans rengi ve düzeni · `tema.js`te
  ölü kalan `#panel-troops .stat-row` kuralları silinecek.

- **BİRLİK EĞİTİM EKRANLARI TAM EKRAN** (`tema.js` `troopPanelV2`).
  Üç aile de (Savunucu · Koruyucu · Nişancı) aynı `.uv-viewer`ın
  içinde durduğu için tek kural üçünü birden kapsıyor — ayrı ölçü
  yazılmadı, yoksa aileler arası geçişte panel zıplar.
  **KÖK (Tuzak 38):** tam ekran kuralını yazmak yetmiyordu; aynı
  dosyada DAHA SONRA gelen "HİZA: kahraman kartıyla birebir aynı"
  bloğu 60/12/70 boşluğu ve `max-width:420px`i geri koyuyordu,
  "PANEL ÇERÇEVELERİ" bloğu da 2px kenarı. Ezme üstüne ezme
  yazmak yerine ikisinden de ÖLÇÜ SİLİNDİ; panelin tek ölçü
  kaynağı artık `troopPanelV2`nin baş bloğu.
  Ölçüldü (412×820, 2×): kart **412×820 = tam ekran** · köşe 0 ·
  kenar 0 · panel dolgusu 0 · üç ailede de birebir aynı ·
  sayfa yatay kaydırması yok (412).
  **GERİ DÖNÜŞ:** `#panel-troops`a `padding:60px 12px 70px`,
  `.uv-viewer`a `max-width:420px` + `border-radius:22px`.

- **Kahraman listesi 4×4** (`kahramanlar.js KLIST_UI.sutun/satir`).
  Ölçüldü (412×820): 4 sütun × 4 satır, kart 94,8×171,8, ızgarada
  dikey kaydırma 0, alt şerit (8/8 + Kahraman Al) ekranda.

- **KAHRAMAN DETAYINDAKİ ÇERÇEVE KALDIRILDI.** `tema.js`te
  `#heroDetailOverlay`e 3px kenar + İKİ iç kabartı + dış parlama
  yazılıydı; hem görünüm kuralına aykırıydı (3B yok) hem de bu
  pencereyi oyunun geri kalanından ayrı bir şeymiş gibi
  gösteriyordu. `kahramanlar.js`teki kart gölgesi de silindi.
  NOT: pencerenin `z-index`i hâlâ **400** (öbür paneller 50) —
  "üstüne hiçbir şey binemiyor" hissi buradan geliyor. Dokunulmadı,
  ayrı bir karar.

- **YETENEK KUTULARININ İLK KARE PARLAMASI — kök bulundu.**
  Kutuların ölçüsü, çerçevesi ve kaydırması `applyUi()`da yazılıyor;
  o çalışana kadar tarayıcı kutuları VARSAYILAN hâlleriyle bir kare
  çiziyordu. Görülen buydu: çerçeveler bir an belirip kayboluyor,
  üçüncü kutu (kaydırması henüz yok) yukarıda çıkıp yerine
  zıplıyordu. Kahramanlar arası geçişte DOM baştan yazıldığı için
  her seferinde tekrarlıyordu.
  Çözüm: sütunlar `visibility:hidden` başlar, `applyUi` sonunda
  görünür olur. **`display:none` DEĞİL** — o ölçüyü 0 yapar
  (Tuzak 14) ve applyUi yanlış hesaplar.

- **KAHRAMAN LİSTESİ ve DETAYI TAM EKRAN** (`heroes.js
  HERO_UI.kartTamEkran = true`). Tek anahtar ikisini birden açıyor.

  **HİZA SORUNU ve ÇÖZÜMÜ:** yetenek kutuları kartın ortasına SABİT
  pikselle bağlıydı (`top:50%` + `dy:-150`), kahraman görseli ise
  kendi ölçüsünü kabuktan alıp 9:16'ya oturuyor. Tam ekranda ikisi
  FARKLI oranda büyüyor (412×820'de kart ×1,165, model ×1,062), yani
  kutular karakterden ayrı düşüyordu.
  Artık bütün kutu ölçüleri MODELE göre ölçekleniyor (`_modelOran`):
  oran = modelin şimdiki yüksekliği / eski düzendeki yüksekliği.
  Sütunlar da kartın değil MODELİN kenarından başlıyor — kart tam
  ekranda modelden geniş olabilir, kart kenarına yaslanınca kutular
  karakterden uzaklaşıyordu.
  HERO_UI değerleri OLDUĞU GİBİ kalır, ayar paneli aynı sayıları
  yazmaya devam eder; yalnız çizerken oranla çarpılırlar. Eski düzen
  ölçüleri de HERO_UI'dan okunur (kartUst/kartAlt/kartKenar/
  kartMaxGenislik) — biri değişirse oran kendiliğinden düzelir.

  Hesaplandı (dört ekran boyunda): tam ekranda oran **1,06**,
  `yan` 8 → 8,5px, `dy` -150 → **-159**; kart modunda oran tam
  **1,000**.
  **GERİ DÖNÜŞ TEK SATIR:** `kartTamEkran = false` — ölçekleyici
  1 döndüğü için hiza birebir eski hâline döner.

- **ÇERÇEVE RENGİ HER EŞYAYA — TEK KAYNAK** (`magaza.js
  urunCerceve()`). Mağaza kartı da çanta kutucuğu da buradan okur.
  Dört renk: **yeşil · mavi · mor · turuncu** (değerler `tema.js`
  `--cr-*`).

  | eşya | renk |
  |---|---|
  | 5 dk hızlandırma | yeşil |
  | 1 saat hızlandırma | mavi |
  | 3 saat hızlandırma | mor |
  | İntikal %25 · %50 | mor · turuncu |
  | kaynak sandıkları (düşük seviye) | yeşil |
  | tecrübe kitabı | mavi |
  | kahraman buff'ı ve parçası | **kahramanın nadirliği** |

  **KAHRAMAN EŞYALARI RENGİ İKİNCİ KEZ YAZMAZ:** buff ve parça,
  rengini `KAHRAMAN.nadirlik()`ten alır (`ssr` → turuncu, `mor` →
  mor). Kahramanın nadirliği değişirse eşyası da onunla döner.
  Eski `cantaCerceve` buff'ı HEP mor yazıyordu — turuncu kahramanın
  buff'ı yanlış renkteydi; o kopya kural silindi, çanta artık
  `urunCerceve`ye devrediyor.

  **İLERİSİ İÇİN ELLE EZME:** bir ürüne `cerceve: "mavi"` yazmak
  kuralı geçersiz kılar. Üst seviye kaynaklar gelince onların
  satırına bu alanı eklemek yeter — "kaynak = yeşil" kuralını
  değiştirmeye gerek yok, mevcut düşük seviye kaynaklar yeşil kalır.

  **PALETİN KAPSAMI KALDIRILDI:** `.cr-*` sınıfları yalnız
  `#panel-inventory` altında tanımlıydı; mağaza kartına aynı sınıfı
  verince renk gelmiyordu. Artık sınıf nerede kullanılırsa orada
  çalışıyor.
  Çerçeve mağazada da ürün GÖRSELİNİN çevresinde duruyor, kartın
  dışında değil — kart zaten koyu mavi bir kutu, dış kenarını
  boyamak on iki kartı yan yana kirli gösteriyordu.

  Sınandı: 28 ürünün hepsi tek tek listelendi, hepsi kurala uydu.
  Market **3 sütuna** döndü (412×820: kart 122,7×118,4, hepsi eşit,
  ızgara taşması 0).

- **Tuzak 27 için KALICI DENETİM.** Şablon dizgisi içindeki yoruma
  ters tırnak koymak bu turda DÖRDÜNCÜ kez dosyayı çökertti.
  Artık `tema.js` · `magaza.js` · `buff.js` · `kahramanlar.js` ·
  `heroes.js` dosyalarındaki `textContent = ...` bloklarının
  içindeki yorumları tarayan bir denetim var; ters tırnak bulursa
  dosya ve satır numarasıyla söylüyor.

- **MARKET TAM EKRAN + 4 SÜTUN.** Çantayla aynı kalıp: panel ekranın
  tamamı, başlık/yenilenme/sekmeler üstte, yalnız ürün ızgarası kayar.
  Sütun 3 → **4** (tam ekranda üç sütun kartları gereksiz şişiriyordu).
  **KÖK (Tuzak 38, çantadakinin aynısı):** tam ekran kuralını yazmak
  yetmiyor — `#panel-hospital, #panel-chest, #panel-shop` ortak bloğu
  DAHA SONRA gelip 60/12/70 boşluğu ve `max-width:420px`i geri
  koyuyor. Market o listeden **çıkarıldı**; hastane ve sandık aynen
  kaldı. Ayrıca "panel çerçeveleri" bloğundan da çıkarıldı: ekranın
  dört yanına 2px çerçeve çizmenin anlamı yok.
  Ölçüldü (412×820): kart **412×820 = tam ekran** · **4 sütun** ·
  on iki kartın hepsi aynı ende (89,5×99,2) · ilk satırda 4 kart ·
  fiyat düğmesi karta sığıyor · ızgara taşması 0 · sayfa yatay
  kaydırması yok.

- **KAHRAMAN EKRANLARI AYRI BÖLÜME BIRAKILDI — sebebi ölçüldü.**
  `HERO_UI.kartTamEkran` anahtarı hem listeyi hem detayı tek seferde
  tam ekran yapıyor, ama detay ekranında HİZA KIRILIYOR:
  - Yetenek kutuları kartın DİKEY ORTASINA sabit pikselle bağlı
    (`top:50%` + `translateY(box.dy)`, dy = -150px).
  - Kahraman görseli ise kendi ölçüsünü kabuktan alıp **9:16'ya
    oturuyor** (`ch0 = min(vh, vw*16/9)`).
  412×820'de: kart yüksekliği 704 → 820 (**×1,165**) ama model
  689,8 → 732,4 (**×1,062**) büyüyor. İki oran farklı olduğu için
  kutular karakterden ayrı düşer — sabit dy'yi kart oranıyla da
  model oranıyla da çarpmak yanlış sonuç verir.
  **DOĞRU ÇÖZÜM (sıradaki iş):** kutuları kartın ortasına değil
  MODELİN kutusuna bağlamak — yetenek sütunlarını model görseliyle
  aynı ölçüdeki (cw0×ch0) bir sarmalın içine almak. O zaman bütün
  dx/dy değerleri modele göre olur ve her ekran boyunda kendiliğinden
  uyar; sihirli oran gerekmez.

- **BALONCUK AÇIKLAMALARI: TEK CÜMLE, SİMGESİZ** (`magaza.js
  kisaAciklama()`). Çanta ve mağaza baloncukları artık tam metni
  değil YALNIZ İLK CÜMLEYİ, simgesiz hâlde gösteriyor; tam metin
  satın alma penceresinde duruyor. İki ayıklama var: HTML etiketleri
  (elmas/kaynak GÖRSELİ innerHTML'e basılıyor, düz metne düşünce ham
  `<img>` görünür) ve emoji.

  **İLK CÜMLE NOKTA + BOŞLUK ile ayrılır, düz nokta ile DEĞİL:**
  Türkçe binlik ayracı da nokta ("5.000 Demir") — düz noktadan
  bölünce metin "5." diye kesiliyordu.

  **İLK CÜMLE ANLAMLI OLMALI** — iki açıklama bu yüzden yeniden
  yazıldı: kalkan "Çantana düşer." ile başlıyordu (baloncukta
  kalkanın ne yaptığı hiç yazmıyordu) → "Kalen 6 saat saldırıya
  kapanır."; tecrübe kitabı da aynı şekilde → "Kahramanın tecrübe
  seviyesini yükseltir." Can potundaki "(envanterine düşer)" eki
  silindi.
  Sınandı: Demir Sandığı "5.000 Demir doğrudan kaynaklarına
  eklenir." · Mor Parça / Buzul Özü / İntikal %25 hepsi tek cümle.

- **Hızlandırma açıklaması düzeltildi.** "Eğitim/iyileşme süresini
  1 saat kısaltır" yazıyordu; oysa GENEL hızlandırma, şehirdeki
  bekleyen işe uygulanıyor. Artık yalnız süreyi söylüyor:
  **"1 saat hızlandırır."** · **"5 dakika hızlandırır."**

- **Bonus eşyasının ESKİ penceresi çantadan kaldırıldı** (`buff.js`).
  Çantada bonus kutucuğuna dokununca güçlendirme menüsünün kendi
  penceresi açılıyordu (capture evresinde dinleyen ayrı bir blok):
  tek panelde iki ayrı pencere modeli. Dinleyici **silindi**; bonus
  eşyası artık çantada da satır altı baloncuğunu açıyor ve oradaki
  "Kahramana Git" düğmesiyle kahraman ekranına gidiliyor.
  Güçlendirme menüsünün kendi penceresi (`detayAc`) DURUYOR —
  sefere gönderme panelinden açılan yol değişmedi.

- **MAĞAZA BİLGİ PENCERESİ ÇANTAYLA AYNI KALIBA ALINDI** (`magaza.js`
  `showShopInfoPopup`, stil `tema.js`).
  İki panelde iki ayrı bilgi penceresi vardı: çantada satır altı
  açık baloncuk, mağazada karta göre MUTLAK konumlanan koyu kutu
  (`.shop-info-pop` + `positionShopPopup`). İkincisi kartın üstüne
  biniyor, ızgara kayınca kartından ayrı düşüyordu — o yüzden
  "kaydırınca kapat" diye ayrı bir çare yazılmıştı.
  Artık mağaza baloncuğu da ızgaranın bir HÜCRESİ (`.shop-pop`,
  `grid-column:1/-1`): kartın satırının altına girer, kayınca
  kartıyla birlikte gider. Kaydırınca kapatma **silindi**, gereksiz
  kaldı. `positionShopPopup` ve ölü `.shop-info-pop` CSS'i de silindi.

  **SATIR GEOMETRİDEN BULUNUR, sütun sayısından DEĞİL:** mağaza
  ızgarasında ara başlıklar (`.shop-tier-header`) satırın tamamını
  kaplıyor, "her satırda üç kart" varsayımı kırılır. Aynı
  `offsetTop`taki son kart aranır. Ok da sabit sütun oranıyla değil,
  kartın ölçülen ortasından YÜZDE olarak (`--ok`) yazılır.

  Ölçüldü (412×820): baloncuk ızgarayı kaplıyor (340/344) · kartın
  satırının ALTINDA · ok sapması **0,0 px** · zemin çantadakiyle
  aynı (`rgba(233,246,255,.96)`) · seçili kartta köşe işaretleri ·
  sayfa yatay kaydırması yok.

  **Tuzak 27 ÜÇÜNCÜ KEZ ısırdı:** `tema.js`teki şablon dizgisinin
  içine yazdığım yoruma ters tırnak koydum (`.inv-pop`), dosya
  çöktü. `node --check` yakaladı. Ayrıca `magaza.js`in enjekte
  ettiği CSS dizgisinden ölü kuralı silerken yorumu kapatmayı
  unuttum — dizgiyi ayrıştırıp yorum aç/kapa sayısını saymak
  yakaladı (6/5). Bu dosyada CSS bir DİZGİ içinde, `node --check`
  onu görmez.

- **ÇANTA — KUTUCUK ŞERİTLERİ VE BOŞ SEKME.**
  - **Anlamsız "1" rozeti kalktı.** Kök `magaza.js urunRozeti()`in
    son satırıydı: eşleşmeyen her ürüne `return "1"`. Bonus eşyası,
    kahraman parçası, tecrübe kitabı ve donanımın "ne kadar verdiği"
    diye bir sayısı yok — kutucuğun üstünde anlamsız bir 1 duruyordu,
    kaç tane olduğu zaten alt şeritte yazıyor. Artık **boş** döner.
    Mağaza kartı boş rozet istemiyor, orada `urunRozeti(item) || "1"`
    ile doldurulur — tek kaynak korundu.
    Sınandı: kaynak "10K" · hızlandırma "5dk" · kalkan "6sa" ·
    intikal "%25" · bonus/parça/kitap **""**.
  - **Şeritler düz oldu.** Üstteki rozet "gittikçe kararan" bir
    gradyan perdeydi, çizimin üstünde kirli bir leke gibi duruyordu.
    Alttaki adet ise çıplak beyaz rakamdı ve okunsun diye **sekiz
    yönlü kalın kontur gölgesi** taşıyordu — hem ağır, hem 3B'siz
    görünüm kuralına aykırı.
    **ÜSTTEKİ** artık düz, yarı saydam siyah bant
    (`rgba(0,0,0,.42)`), ortalı, punto 11 → **12,5**.
    **ALTTAKİNE ŞERİT KONMADI** (denendi, istenmedi: çizimin alt
    kenarını kapatıyordu) — rakam doğrudan görselin üstünde, sağ
    altta durur. Eski sekiz yönlü kontur GERİ GELMEZ; okunurluğu
    tek, yumuşak bir gölge sağlar.
  - **Boş sekmede hiçbir şey yazmıyor.** Örümcek ağı + "Bu bölümde
    eşyan yok" satırı dört sütunluk ızgaranın TEK hücresine sıkışıp
    kelime kelime alt alta diziliyordu. Boş ızgara zaten kendini
    anlatıyor.

- **ÇANTA — BÖLÜM 2: SATIR ALTI BALONCUĞU** (`index.html`
  `cantaBaloncukHTML` / `cantaBaloncukBagla` / `cantaEsyaKullan`).

  **KÖK (eski durum):** `tema.js`'te yakalama evresinde çalışan bir
  dinleyici vardı; kutucuğa dokununca MAĞAZANIN satın alma
  penceresinin kopyasını açıyordu ve yalnız **kaynak paketiyle
  kalkanı** tanıyordu. Parça, tecrübe kitabı ve bonus eşyalarına
  dokununca **hiçbir şey olmuyordu** — üstelik sessizce, çünkü
  `if (!d.isKaynak) return;` diyip çıkıyordu.
  O blok (235 satır) **silindi**, ikinci dinleyici bırakılmadı:
  yakalama evresinde çalıştığı için yenisine hiç sıra gelmezdi.

  - Baloncuk, dokunulan kutucuğun **satırının altına** eklenir ve
    satırın tamamını kaplar (`grid-column:1/-1` ŞART — ızgara dört
    sütunlu, verilmezse baloncuk tek hücreye sıkışır). Ok, dokunulan
    kutucuğun ortasını gösterir: sütun (n+0,5)/4.
    Ölçüldü: ok ile seçili kutucuğun merkezi arasında **0,9 px**.
  - **Kullanım kuralı TEK YERDE** — `cantaKullanim(def)`:
    `adet` (sürgüyle kaç tane: kaynak, parça) · `tek` (kalkan, can
    potu) · `git` (bonus ve tecrübe kitabı → **Kahramana Git**,
    `openOverlayPanel("hero")`) · `yok`.
    Kahraman parçası ve kitabı böylece çantadan kullanılabilir oldu.
  - Açıklama `magaza.js shopItemDesc()`ten gelir — mağaza baloncuğu
    da aynı metni okur, ikinci bir açıklama tablosu açılmadı.
  - Sürgü hızlandırma penceresiyle aynı dil: konum piksel, tutamak
    kulp, yarı genişlik (9) JS ile CSS'te aynı.
  - Aynı kutucuğa tekrar dokunmak baloncuğu kapatır; sekme
    değişince de kapanır. Seçili eşya o sekmede değilse baloncuk
    kendiliğinden düşer.

  **TUZAK 10 BURADA ISIRDI:** parça havuzuna yazan işlevi
  `window.parcaEkleAnahtar` diye çağırmıştım — `gelistir.js` onu
  **`window.parcaEkle`** adıyla açıyor (içerideki adı
  `parcaEkleAnahtar`). Yanlış adla çağrılsaydı hiçbir hata çıkmaz,
  parça çantadan düşer ama havuza HİÇ girmezdi.

  `itemCard`'a `data-name` eklendi: baloncuk eşyayı bundan bulur.
  Eskiden ad ekrandaki yazıdan okunacaktı, o yazı iki satırda
  kırpıldığı için eşleşme kaybolurdu.

  Ölçüldü (412×820): baloncuk satırı kaplıyor (382/370) · satırın
  ALTINDA · ok sapması 0,9 px · seçili kutucukta köşe işaretleri ·
  sayfa yatay kaydırması yok.

- **ÇANTA — BÖLÜM 1: TAM EKRAN + SEKMELER + ROZET** (`index.html`
  `renderInventory` · `magaza.js` · `tema.js` çanta bloğu).
  Referans oyundaki düzene geçiş. Büyük iş olduğu için ikiye
  bölündü; bu bölüm ÇERÇEVE, ikinci bölüm BALONCUK.

  - **Tam ekran.** Çanta alttan çıkan 420px'lik bir karttı.
    **KÖK (Tuzak 38):** tam ekran kuralını yazmak yetmedi —
    `#panel-hospital, #panel-chest, #panel-shop, #panel-inventory`
    ortak bloğu DAHA SONRA geldiği için 60/12/70 boşluğu ve
    `max-width:420px`i geri koyuyordu. Ezme üstüne ezme yazmak
    yerine **çanta o listeden çıkarıldı**; diğer üç panel aynen
    kaldı. Ölçüldü: kart 412×820 = ekranın tamamı.
  - **Beş sekme:** Kaynaklar · Hızlandırma · Bonus · Donanım · Diğer.
    Hangi eşyanın hangi sekmeye düştüğüne `magaza.js cantaSekmesi()`
    karar verir — TEK KAYNAK, çantada ikinci bir tablo yok.
    Tanımı olmayan anahtar "Diğer"e düşer, eski kayıttan kalan eşya
    sekmesiz kalıp görünmez olmaz.
    Açık sekme `state`e YAZILMAZ (Tuzak 7): ekranda anlamı olan bir
    seçim, `compactStateForExport`a dokunulmadı.
  - **ROZET (sol üst):** eşyanın NE KADAR verdiği ("10K", "5 dk").
    Sağ alttaki sayı KAÇ TANE olduğu — ikisi ayrı şey, ayrı köşede.
    Hesap `magaza.js urunRozeti()`nde: mağaza kartı da çanta
    kutucuğu da oradan okur. Mağazadaki satır içi hesap silindi,
    yoksa aynı eşya mağazada "10K", çantada "10.000" görünürdü.
  - Üstteki "Toplam Elmas / Farklı Eşya" özet kartları ve
    açıklama satırı SİLİNDİ (sekme çubuğu geldi); elmas zaten üst
    şeritte duruyordu. `#invDiamonds`/`#invItemCount` yazan JS de
    temizlendi. **NOT:** `?elmasayar=1` panelinin "canta" satırı bu
    özet kutusunun `::before`ini sürüyordu — artık öyle bir kutu
    yok, o satır boşa çalışıyor (çökme yok).

  Ölçüldü (412×820): tam ekran ✔ · 4 sütun · kutucuk 90×90 ·
  rozet ile adet çakışmıyor · beş sekme aynı boyda, hiçbirinde
  yazı taşması yok · sayfa yatay kaydırması yok.

  **BÖLÜM 2 (sırada):** kutucuğa dokununca SATIRIN ALTINDA açılan
  açıklama baloncuğu (başlık + kısa açıklama + sürgülü adet +
  Kullan), kahraman parçasının ve kahraman kitabının çantadan
  kullanılabilmesi (kitap kahraman sayfasına atar), seçili
  kutucuğun köşe işaretleri.

- **Hızlandırma kutucuğu: ÇİZİLMİŞ ÇERÇEVE KALDIRILDI.**
  Kök şuydu: hızlandırma görsellerinin KENDİ çerçevesi var
  (yeşil/mavi/mor kenarlı kare çizimler, 1024×1024). Altına bir de
  kutu çiziliyordu — iki çerçeve üst üste biniyor, üstelik kutu
  kare olmadığı için görsel kırpılıyor/eziliyordu. `cover`→`contain`
  yetmedi, asıl sorun kutunun kare OLMAMASIYDI.
  Artık: kutu **62×62 gerçek kare**, `background:none`, `border:none`;
  kare görsel kare kutuda `contain` ile kutuyu TAM doldurur ve
  hiçbir kenarı kesmez. Görselsiz hızlandırma (⏩) yüzer kalmasın
  diye yalnız ona zemin verilir (`hsm-gorselsiz`).
  Ölçüldü: görsel 1024×1024 → ekranda 62×62, kutuyu tam dolduruyor,
  çizilmiş zemin `none`, kenar `0px`.
- **Seçili hızlandırma: sarı çerçeve değil KÖŞE İŞARETLERİ.**
  Sarı kenar görselin kendi çerçevesinin üstüne biniyor, ikisi
  birbiriyle yarışıyordu. Referanstaki gibi dört köşe işareti
  (`.hsm-ci-sec`, sekiz gradyan — her köşede bir yatay bir dikey
  çubuk), kutunun 3px dışında.
  **Tuzak 13 burada ısırdı:** `.hsm-cards` `overflow-x:auto`, ve o
  yatayda olduğu KADAR dikeyde de kırpıyor — köşe işaretlerinin
  üst/alt uçları kesiliyordu. Izgaraya 4px pay verildi.
- **Düğmeler kısaldı, BİTİR ile KULLAN EŞİT ölçüde.**
  Flex ile iki deneme de tutmadı: `1 1 0` ikisini satırın tamamına
  yayıyor, `0 1 auto` her birini kendi yazısı kadar yapıyordu
  (BİTİR 86, KULLAN 104 — eşit değil).
  Izgara ikisini birden çözer: `width:max-content` ızgaranın enini
  içeriğe göre belirler, `1fr 1fr` o eni ikiye EŞİT böler; yükseklik
  zaten hücrelerin birbirine gerilmesinden eşit geliyor.
  Aralarında 14px boşluk. HIZLI KULLAN tam genişlik değil, ortada.
  Ölçüldü (kart eni 346): BİTİR **104×39** · KULLAN **104×39**
  (en ve boy birebir aynı) · HIZLI KULLAN **154×32** px.
- **Hızlandırma penceresi — kutucuk görseli ve düğme genişliği.**
  Kutucuğun genişliği yazıya bağlanınca kutu kare olmaktan çıktı
  ama görsel hâlâ `object-fit:cover` ile geriliyordu: oklar ezik
  görünüyordu. Görsel artık `contain` ve etiket şeridinin ALTINA
  oturuyor (`top:20px`), oran hiç bozulmuyor. Kutucuk 62 → **66px**,
  taban genişlik 48 → **58px**.
  Düğmeler `flex:1 1 0` ile zorla yarı yarıya bölünüyordu;
  "BİTİR 💎 1.480" sıkışırken "KULLAN" boş duruyordu. `flex:1 1 auto`
  ile her düğme önce kendi yazısı kadar yer alıyor.
  **Tuzak 27 tekrar ısırdı:** `tema.js`teki şablon dizgisinin içine
  yazdığım yoruma ters tırnak koydum, dosya çöktü. `node --check`
  yakaladı.

- **HIZLANDIRMA PENCERESİ ELDEN GEÇİRİLDİ** (`index.html`
  `hizlandirmaPenceresi` + `tema.js temaHizlandirSade`).
  Serdar başka bir oyundan referans getirdi; sekiz ayrı şikâyetin
  her biri ayrı bir kökten geliyordu:

  1. **Kutucukta süre yazmıyordu.** Şablon `x.gorsel ? img :
     etiket + ikon` diye kuruluydu — mağaza görseli OLAN
     hızlandırmalarda "5 dk" etiketi hiç basılmıyordu, üstelik
     `tema.js` görseli `inset:0` ile kutuya yayıyordu. Etiket artık
     HER ZAMAN basılıyor, kutunun üstünde, altında koyu perdeyle
     (açık renkli görselde yazı kayboluyordu).
  2. **Barda "1dk 58sn" yazıyordu.** `sureBicim` harfli ve değişken
     genişlikte. Yeni `saatBicim(ms)` → **`00:01:32`**, her alan iki
     hane; `tabular-nums` ile rakam değişirken yazı kıpırdamıyor.
     `sureBicim`e DOKUNULMADI — kuyruk ve kışla rozeti onu okumaya
     devam ediyor.
  3. **Bar kabaydı:** 28px/köşe 9 → **22px/köşe 11**, uçları tam
     yuvarlak, yazı 15px/900 → 13,5px/800.
  4. **SINIRSIZ SEÇİM — asıl hata.** `enFazla` yalnız envantere
     bakıyordu: 2 dakikalık kuyrukta 8 tane 1 saatlik seçilebiliyor
     ve fazlası karşılıksız yanıyordu. Artık
     `min(envanter, ceil(kalan / birim))`. Tavan `ceil` olduğu için
     SON parçanın taşması hâlâ serbest (24 sn kalmışken 5 dakikalık
     kullanmak yasak değil); yasaklanan üst üste yığmak.
     Sınıra dayanınca −/+ sönüyor.
  5. **"Hızlandırma Süresi" satırı geri geldi.** `#hsmTotal` bir ara
     HTML'den silinmiş, `tazele()` içindeki hesap ise kalmıştı —
     öğe bulunamadığı için sessizce boşa çalışıyordu.
  6. **−/+ kutuları:** 36×32 sarı dikdörtgen → **30px daire**, düz
     renk, sürgüye yer açıldı.
  7. **Sürgü topu kalktı:** yuvarlak top yerine referanstaki gibi
     **dikey yivli kulp** (18×24, köşe 6, iki yiv `::before/::after`).
  8. **Düğmeler inceldi:** `min-height` 40 / hızlı kullan 36,
     dolgu ve harf aralığı düşürüldü.

  **TEK KAYNAK — SURGU_YARI:** tutamağın yarı genişliği (9) iki
  yerde kullanılıyor, çizim (`tazele`) ve dokunma (`oranOku`).
  Eskiden ikisinde de elle `11` yazılıydı; biri değişip diğeri
  unutulursa tutamak parmağın altından kaçar. Artık tek `const`,
  ve CSS'teki `.hsm-thumb` genişliğinin yarısı olmalı.

  **EZME DEĞİL, SİLME (Tuzak 38):** bu pencerenin CSS'i İKİ yerde —
  `index.html` tabanı ve `tema.js`in `!important`li ezmesi. Yeni
  ölçüler tabana yazıldı, `tema.js`te artık çelişen kurallar
  (bar yüksekliği/yazısı, `hsm-step` gölgesi, `hsm-btn` dolgusu,
  `hsm-finish`/`hsm-use`/`hsm-quick` punto ezmeleri) **silindi**.
  `tema.js`te yalnız konum/çerçeve işi kaldı. Üçüncü katman
  açılmadı.

  **İKİNCİ TUR — referans görsele göre rötuş ve İKİ KÖK HATA:**

  - **✕ hizasızdı.** `.overlay-close` mutlak konumluydu ve süre
    çubuğu onun altına girmesin diye `calc(100% - 52px)` ile
    daraltılıyordu — sihirli sayı, üstelik ✕ çubukla hizalı değil.
    İkisi artık tek flex satırında (`.hsm-head`); hizayı düzen
    kuruyor, 52px silindi. ✕ 38 → **30px**.
    Ölçüldü: çubuk ile ✕'in dikey merkez farkı **0,00 px**.
  - **TUTAMAK RAYDAN TAŞIYORDU — sıralama hatası.** `tazele()` önce
    sürgüyü konumlandırıp SONRA adet kutusunun genişliğini rakam
    sayısına göre yazıyordu. İkisi aynı flex satırında: kutu
    genişleyince ray daralıyor, ama tutamak eski genişliğe göre
    yerleştirilmiş kalıyordu. Yani 9 → 10 geçişinde tutamak raydan
    çıkıyordu (ölçüldü: **7,5 px** taşma). Kutu artık ÖNCE yazılıyor,
    ray SONRA ölçülüyor.
    İkinci ayrışma: çizim `clientWidth` (tam sayı) okurken `oranOku`
    kesirli `getBoundingClientRect` okuyordu — sağ uçta yarım piksel
    taşma (209 ↔ 208,5). İki yol da aynı kaynaktan okuyor.
    Ölçüldü: iki uçta da taşma **0,0 px**.
  - **Kart genişliği yazıya uyuyor.** Sabit 66px kareydi. Genişliği
    belirleyen şey etiketin AKIŞTA olması — mutlak konumlu öğe
    kapsayıcının genişliğine katılmaz, etiket eskiden öyleydi.
    Ölçüldü: "1 dk" 48px · "10 dk" **54,4px**, hiçbirinde yazı
    taşması yok.
  - BİTİR sarı → **turuncu** (`#ff9d3c → #ef6f14`); sarı, mağazanın
    elmas düğmeleriyle karışıyordu.
  - Süre çubuğu 22 → **18px**, yazı 13,5 → 12px.
  - −/+ daire → **yuvarlatılmış kare** (köşe 9px), referanstaki gibi.
  - Düğmeler inceldi: `min-height` 40 → **34** (BİTİR/KULLAN 39px),
    HIZLI KULLAN 36 → **32px**, puntolar düşürüldü.

  Ölçüldü (412px, 2×): kart 62 boy · etiket görünür ("1 dk") ·
  bar 18px · −/+ 30×30 · tutamak 18×24 ve **ray içinde** ·
  BİTİR/KULLAN 156×39 · HIZLI KULLAN 320×32 · kartlar yatayda
  taşmıyor (320/320) · sayfa yatay kaydırması yok (412).
  `index.html`in dört satır içi JS bloğu ayrı ayrı `node --check`
  edildi (dördü de geçti; kalan dokuz blok `type="text/plain"` 3B
  verisi, belgedeki 13 sayısı bunlarla birlikte).
  Fonksiyon adları karşılaştırıldı: tek fark eklenen `saatBicim`.

- **"GÜÇ +N" ŞERİDİ: TEK ŞERİT, TEK HİZA + PARLAMA** (`gucefekt.js`,
  `gucefekt-1` → **`gucefekt-2`**).

  **Hiza — kök sebep:** şerit her çağrıda YENİDEN yaratılıyordu ve
  üst üste binmesin diye ekrandaki canlı şerit sayısına göre aşağı
  kaydırılıyordu (`yuva = canlilar.length * 46`). Arka arkaya kışla
  toplayınca şeritler 0 / 46 / 92 px'te çıkıyor, üstelik ilk şerit
  söndükten sonra ikincisi kaydırılmış yerinde kalıyordu — "hepsi
  aynı hizada gelmiyor" tam buydu.
  Çözüm ekrandaki şeridi TEKE indirmek: yeni güç dururken gelirse
  ikinci kutu çizilmez, mevcut şeridin sayısı **toplanır**, girişi
  atlanır (`dogum = simdi() - GIR`), bekleme ve parlama baştan
  başlar. `yuva` ve `canlilar` dizisi tamamen silindi; geri
  koyulursa hiza da geri bozulur.
  ÖLÇÜLDÜ (412×915, ekran ortası 206 / 457,5): üç toplama arka
  arkaya → şerit adedi hep **1**, merkez üçünde de **206,0 / 457,5**,
  dikey yayılma **0,00 px**, yatay **0,00 px**; aralıklı üç
  toplamada da aynı. Sönme sonrası kalan şerit 0.

  **Parlama:** şerit girdikten sonra içinden soldan sağa bir ışık
  hüzmesi kayar. Tuzak 11 gereği CSS animasyonu değil, aynı
  `requestAnimationFrame` döngüsünde. `PARLA_BEK 90` · `PARLA_SURE
  560` · `PARLA_EN 104`; toplamı `GIR + DUR`u geçmez, yoksa ışık
  şerit sönerken yolda kalır.
  İki incelik: (1) ışık `.ge-parla-kutu` içinde ve arka planla AYNI
  kenar solmasıyla (`mask-image`, 17%/83%) maskelenir — şeridin uçları
  saydam olduğu için maskesiz bırakılırsa boşlukta yüzen beyaz bir
  leke görünür; (2) gradyan tek duraklı değil, **keskin çekirdek +
  geniş yumuşak etek** (.10/.30/.78/.30/.10) — tek duraklı hâli
  ekranda ışık gibi değil "biraz açılmış zemin" gibi duruyordu.
  Maske desteklenmeyen tarayıcıda da leke kalmasın diye ışığın kendi
  saydamlığı yolun ilk ve son %22'sinde sönümlenir.
  ÖLÇÜLDÜ: ışık şeridin sol kenarının dışından (x -43px) girip sağ
  kenarının dışına (x 208px, şerit eni 157px) çıkıyor, yön **soldan
  sağa**, görünür süre **508 ms**, şerit sönmeye başlamadan bitiyor.

- **KALELER ARASI 1 KARO BOŞLUK** — `koordinat.js` `KALE_BOSLUK = 1`.
  Kaleler 2×2. Eskiden bitişik durabiliyorlardı; artık aralarında
  en az bir karo boş kalıyor.

  **TEK KAYNAK:** sayı yalnız `koordinat.js`te. `kaleCakisirMi`
  boşluk parametresi VERİLMEDEN çağrılınca kuralı kendisi uygular.
  İki yerleştirme sınavı da artık boşluksuz çağırıyor:
  `kale2x2.js` `bosMu` ve `index.html` `kaleKonabilirMi` —
  ikisi de eskiden elle `0` geçiyordu. Elle sayı yazılırsa biri
  güncellenip diğeri unutulduğunda kale bir yoldan konabilip
  başka yoldan konamaz hâle gelir.

  Ölçüldü (kale sol üst (10,10), komşu sağa kayıyor):
  dx 0/1/2 **DOLU** · dx 3/4 **boş** — yani bitişik (dx=2) artık
  yasak, bir karo boşluklu (dx=3) serbest. `kale2x2.bosMu` beş
  denemede de aynı cevabı verdi. `koordinat.js` sınavına üç yeni
  madde eklendi (bitişik dolu · 1 karo boşluklu serbest · dikeyde
  de aynı); 25/26 geçiyor, kalan tek madde harness'ta harita.js
  yüklü olmadığı için.

  NOT: kural YENİ yerleştirmelere ve taşımalara işler. Hâlihazırda
  bitişik duran kaleler yerinden oynatılmaz.

- **KALE HİZASI: beş seviye de yeniden yazıldı** (`?kaleayar=1` özeti).

  | | eski | yeni |
  |---|---|---|
  | Sv1 (taban kural) | 130px dy-75 | **132px dy-19** |
  | Sv2 | 166px dy22 | **138px dy-11** |
  | Sv3 | 176px dy0 | **172px dy-34** |
  | Sv4 | 186px dy-21 dx-2 | aynı |
  | Sv5 | 252px dy-42 dx-14 | aynı |

  Sv3'ün `transform:none` satırı gitti — artık kendi kaydırmasını
  AÇIKÇA yazıyor. Sv1 kuralı ortak seçici olduğu için buraya da
  düşer; yazılmazsa Sv3 kendi dy'si yerine Sv1'inkinde durur.
  Panelin `AYAR` tablosu ve üç yorumdaki "güncel set" satırı da
  aynı sayılara çekildi.
  Ölçüldü: beş seviyede de yayın dökümle birebir, panel kapalıyken
  de açıkken de — zıplama yok.

- **KALE ETİKETİ: BEŞ SEVİYE DE KALICI YAZILDI** (`?etiket=1` panelinin
  DEĞERLER dökümünden birebir).

  | | yazı | genişlik | dolgu | köşe | kayma | görsel | boşluk |
  |---|---|---|---|---|---|---|---|
  | Sv1 | 17 | 400 | 0 **35** | 30 | **6 / -14** | 67×123 | -47 |
  | Sv2 | 17 | 400 | 0 30 | 30 | **6 / -12** | 67×123 | -47 |
  | Sv3 | 17 | 400 | 0 30 | 30 | **0 / -16** | 67×123 | -47 |
  | Sv4 | 17 | 400 | 0 30 | 30 | **0 / -34** | 67×123 | -47 |
  | Sv5 | 17 | 400 | 0 30 | 30 | **0 / -64** | 67×123 | -47 |

  ORTAK kural bu yüzden değişti: `max-width` 215 → **400**,
  `padding` 0 19 → **0 30**, `::before margin-right` -34 → **-47**,
  `data-sv` gelmezse kullanılan kayma 17 → **-16** (Sv3 hizası).
  Seviyeye özel yazılan tek alan KAYMA (ve Sv1'de dolgu).

  **TABAN FARKI:** paneldeki sayı ile CSS arasında 61px vardır —
  `css dikey = 61 + panel dikey`. Panelin `KALE_SEVIYE_FARKI`
  tablosu bu kuralın eşidir (Sv1 -75 · Sv2 -73 · Sv3 -77 ·
  Sv4 -95 · Sv5 -125) ve `KALE_VARSAYILAN` da ortak kurala çekildi.
  Biri değişip diğeri unutulursa panel açılınca etiket zıplar.

  Ölçüldü: beş seviyede de yayın dökümle **birebir**, hem panel
  kapalıyken hem açıkken — zıplama yok.

  NOT: dökümün son bölümü (`harita.js CFG.etiket` — kaynak/canavar
  düğüm etiketi) ekran görüntülerinde kesikti, o kısma dokunulmadı.

- **DENEME KALELERİ — `?botkale=1`** (`index.html` `denemeKaleleriHTML`).
  Kendi kalenin ÜSTÜNE iki sıra, sırada Sv1..Sv5 → **10 kale**.
  Seviye hizası ancak beş seviye aynı anda ekranda dururken
  ayarlanabiliyordu, oyunda beşini yan yana bulmak şansa kalmıştı.
  Firebase'e yazılmaz, `otherCastles`'a girmez; `bot-kale` sınıfı
  taşır ve `pointer-events:none` ile dokunmayı geçirir (olmayan
  hesabın savaş paneli açılmasın). Aralık 7 karo, sıra arası 9 —
  Sv5 görseli 252px, daha dar verilirse üst üste biniyor.
  Izgara sınırı `HARITA.CFG.grid`ten okunur, sayı gömülmedi.
  **İş bitince blok silinir.** Ölçüldü: parametresiz 0 kale,
  `?botkale=1` ile 10 kale (1,2,3,4,5 · 1,2,3,4,5), hepsi tıklanamaz.

- **Etiket Sv5 kalıcı yazıldı** (panelde ölçülen set):
  `translate(6px, -68px)` — panel yatay 6 · dikey -129 (taban 61).
  Genişlik/dolgu/görsel boşluğu ORTAK kurala döndü; eskiden Sv5'e
  ayrıca `max-width:400px`, `padding:0 30px`, `margin-right:-47px`
  yazılıydı, hepsi silindi. `KALE_SEVIYE_FARKI[5]` de `{kDy:-129, kDx:6}`.

- **Etiket panelinde sayı kutusu ekrandan taşıyordu** — değeri
  okuyamıyordun ("En çok genişlik" kutusu kırpık). Üç sebep:
  `.ad` `flex:1` + `nowrap` (min-width:0 yoktu), gövde 244px,
  ve **sürgünün min-content genişliği Chromium'da 129px** —
  `min-width:0` yazılmadan `flex-basis:78px` yok sayılıyor.
  Düzeltildi: gövde 290px (`max-width:calc(100vw - 16px)`),
  `.ad` ellipsis + min-width:0, sürgü `min-width:0;width:78px`.
  Ölçüldü 412px ve 360px ekranda: kırpılan ad YOK, taşan kutu YOK.

- **AYAR PANELLERİ YAYINDAKİ DEĞERLERLE ÖRTÜŞTÜRÜLDÜ** (iki panel).

  **Kale (`?kaleayar=1`):** Serdar'ın panelde ölçtüğü SON set kalıcı
  yazıldı. `index.html`:

  | | eski | yeni |
  |---|---|---|
  | Sv1 (taban kural) | 122px | **130px** dy-75 |
  | Sv2 | 166px dy22 | aynı |
  | Sv3 | 176px | aynı |
  | Sv4 | 186px dy-21 dx-2 | aynı |
  | Sv5 | 198px dy-102 dx-2 | **252px dy-42 dx-14** |

  Panelin kendi `AYAR` tablosu ve üç yorumdaki "güncel set" satırı da
  aynı sayılara çekildi — ayrışırsa panel açılınca kale zıplar.
  Ölçüldü: beş seviyede de panel ile yayın BİREBİR aynı.

  **Etiket (`?etiket=1`) — GERÇEK HATA:** panel beş seviyeyi de TEK
  varsayılanla başlatıyordu. Oysa `kaleEtiketi` bloğunda Sv1, Sv4 ve
  Sv5'in kendi kuralları var. Panel açılır açılmaz etiket yerinden
  oynuyordu; bloğun kendi şartı ("ayrışırsa neyi ayarladığın belli
  olmaz") tutmuyordu.
  ÖLÇÜLDÜ (panel açıldıktan sonra, eski ↔ yeni):

  | | eski (panel açılınca) | yeni |
  |---|---|---|
  | Sv1 dikey | -2 → **+17** (19px zıpladı) | -2 → -2 ✔ |
  | Sv5 dikey | -34 → **+17** (51px zıpladı) | -34 → -34 ✔ |
  | Sv5 genişlik/dolgu | 400/30 → **215/19** | 400/30 ✔ |

  Çözüm: `KALE_SEVIYE_FARKI` tablosu — Sv1 `kDy:-63`, Sv4 `kDy:-80`,
  Sv5 `kDy:-95, kGenis:400, kDolguY:30, kGX:-47`. `SIFIRLA` da artık
  düz varsayılana değil YAYINDAKİ hâle döner.

  **DİKKAT:** panelin kayıtları `localStorage["bdEtiketSv1"]`de durur ve
  varsayılanı EZER. Telefonda eski sayılar duruyorsa panelde bir kez
  **SIFIRLA**'ya basmak gerekir.

- **İSTATİSTİKLER satırlarında renk, EKRANDAKİ SAYIYA bakıyor** (`statKarsiHTML`).
  Hata: kıyas her zaman YÜZDE üzerindendi. İki tarafın da araştırma/
  kahraman bonusu yoksa iki yüzde de 0 olur, satır renksiz kalırdı —
  oysa o satırda ham stat değerleri yazıyor ve biri açık ara önde
  olabiliyor. Canlı örnek: *Savunucu Öldürücülüğü %7'ye %1,2*, ikisi
  de siyah.
  Yeni kural: **ikisi de yüzde yazıyorsa yüzdeler, aksi hâlde savaşta
  kullanılan gerçek stat** kıyaslanır. Böylece renk ekrandaki sayıyla
  hiç çelişmez. Üç durumun üçü de sınandı (ikisi yüzdeli · karışık ·
  ikisi ham).
  Karışık durumda (bir tarafta bonus var, diğerinde hiç yok) renk
  gerçek stata bakar: "+%100" kırmızı, "%30" yeşil olabilir — çünkü
  bonussuz birlik gerçekten daha güçlüdür. Bu bilerek böyle.

- **Rapor kağıdı bir tık açıldı:** `--rp-kagit` #bd9660 → **#c9a472**,
  `--rp-kagit-alt` #94703f → **#a17c4c**. Sadece rapor kapsayıcısında
  (#temaReportBack ve .sd-back) yeniden tanımlandı, oyunun geri kalanı
  etkilenmez.

- **SAVAŞ RAPORU TAM EKRAN** (`tema.js` sonundaki `raporTamEkran` bloğu).
  Dört istek birlikte:
  1. Pencere tam ekran (eskiden ortada 380px'lik kart).
     `#temaReportBack` padding'i INLINE yazılıyor, o yüzden kuralların
     hepsi `!important`. `box-sizing:border-box` şart — yoksa kutu
     ekran + padding kadar uzuyor (ölçüldü: 947px/915px).
  2. Başlık yazıları doygunlaştı: `#584021` → **`#6b3706`**
     (BİRLİKLER/ÖLEN/YARALANAN satır adları, bölüm başlıkları,
     taraf adları, Savaş Detayları sütun başlıkları). Punto da
     10,5 → 11,5.
  3. Kahraman yıldızları 11px → **15px**, aralık 1 → 2px.
  4. Birlik kutucukları artık **asla alt satıra düşmüyor**:
     `.rp-chips`teki `flex-wrap:wrap` → `nowrap`, kutular
     `min-width:0` ile daralabiliyor, rakam 10px.
     Ölçüldü: iki tarafta da 3 kutu **tek satır**, taşma 0,
     "10.420.917" tam sığıyor.

  Düzen: başlık üstte sabit, içerik `.rp-sayfa` içinde kayar,
  oklar + SAVAŞ DETAYLARI altta sabit. `:not([hidden])` şart —
  gizli 2. sayfaya `display:flex` verilirse görünür hâle gelir.

  **TUZAK (ölçülerek bulundu):** `.rp-cols-hero` ve `.rp-cols-troop`
  üzerindeki `margin-left/right:-9px` dar kart için konmuştu; tam
  ekranda içeriği panelin dışına taşırıyordu (sayfa 384px, kaydırma
  393px, kahraman portresi soldan kırpık). Yeni blokta 0'landı.

  Geri alma: `raporTamEkran` IIFE'sini sil, rapor eski kart hâline döner.

- **BOZGUN EŞİĞİ YENİ MOTORDA AÇILDI** (`CFG.yeniBozgun`, `yeniRoutDenk`,
  `yeniRoutZayif`). Önceki durumda kaybeden ordu son askerine kadar
  sahada eriyordu: "HAYATTA KALANLAR" satırı hep 0 çıkıyor ve umutsuz
  saldırının bedeli, fark ne olursa olsun sabit **%30** oluyordu.
  Ordu artık savaşa giren sayısının belli bir oranına düşünce dağılır,
  kalanlar sağ döner. Eşik güç oranına göre kayar: denk savaşta %25
  kalınca, umutsuz savaşta %40 kalınca.

  ÖLÇÜM — Serdar'ın gerçek savaşı, 117.900 asker → 20,1M (7 savaş ort.):

  | ayar | kalıcı kayıp | %ordu | sağ dönen | rakipten düşen |
  |---|---|---|---|---|
  | kapalı (önceki) | 35.370 | 30,0% | 0 | 2.426 |
  | z=0,35 | 17.099 | 14,5% | ~41.000 | 2.273 |
  | **z=0,40 (seçilen)** | **15.010** | **12,7%** | **47.118** | **2.189** |
  | z=0,45 | 13.051 | 11,1% | ~53.000 | 2.131 |

  **Kendi kaybın yarıya inerken verdiğin hasar yalnız %10 azalıyor.**
  Sebebi TEMAS SINIRI: ordu 50.000'in üstünde kaldığı sürece tam güçle
  vuruyor, bozgun oraya inmeden savaşı bitiriyor. Kalite/sayı dengesi
  de bozulmadı: 100.000 elit hâlâ 27,8 kat kalabalığı yeniyor (önce 26,9).

  Diğer senaryolar (z=0,40): denk savaş %16,4 · kıl payı kayıp %16,0 ·
  500 asker → 20,1M %12,8. Hepsi Serdar'ın istediği %10-20 aralığında.

  **TERS ETKİSİ — bilerek kabul edildi:** bozgun İKİ TARAFA da işler.
  Ezici kazandığın savaşta rakip de erken dağılır, ondan düşürdüğün
  asker azalır (12.000 → 5.200). Yani kırım yaparak farm etmek zorlaştı.

  Geri almak için: `CFG.yeniBozgun = false`. Tek satır.

- **DOĞRULANDI: birlik statları İSTATİSTİKLER yüzdelerine işlemiyor.**
  Şüphe edilmişti. `statKarsiHTML` yüzdeyi
  `Σ(savaştaki stat × sayı) / Σ(ham taban × sayı) − 1` ile buluyor;
  kademe tabanı sadeleşiyor. Deneyle doğrulandı: bonussuz orduyla Sv1,
  Sv3, Sv6 ve karışık ordu hepsi **%0** veriyor. O yüzdeler yalnız
  araştırma + kahraman + buff bonusudur.

- **Savaş raporu: İKİ SAYFADA DA aile başına tek kutucuk.** Ana sayfadaki
  birlik kutucukları (`unitChips`) ve döküm sayfası aynı kuralı kullanır:
  üç aile, üç kutu; sayı toplanır, görsel baskın kademenin, köşede
  ortalama kademe. Serdar'ın savaşında 11 kutucuk → 6.
- **Savaş raporu birlik dökümü: aile başına TEK satır.** Eskiden her
  KADEME ayrı bloktu (Sv5 Savunucu ayrı, Sv6 Savunucu ayrı) ve iki
  taraf kademe kademe eşleniyordu; karışık ordularda 6-8 blok çıkıyor,
  görseli olmayan kademelerde boş kutu kalıyordu. Artık üç aile, üç
  blok: sayılar toplanır, tek kafa kutucuğu (baskın kademenin görseli)
  ve köşesinde **ortalama kademe** yazar — `Sv 1,4` gibi.
  Ortalama SAYIYA göre ağırlıklı: 1000 Sv5 + 500 Sv6 → `Sv 5,3`.
  Rozet `.rp-por-sv`, kutunun içine mutlak konumlu (`.rep-por` zaten
  `position:relative`); `.rp-krs-baslik`in flex düzenine dokunulmadı.
- **Garnizon KAPATILDI** (`garnizonTaban: 0`). Sebep: yeni motorla
  birlikte üç yumuşatma birden devredeydi (bozgun eşiği + garnizon +
  hafif yaralı) ve etkileri ayrıştırılamıyordu. Kod duruyor, 100000
  yazınca geri gelir. Bozgun eşiğine dokunulmadı (yeni motorda kapalı).

- **SAVAŞ MOTORU YENİLENDİ** (`CFG.yeniMotor`, tek geri dönüş anahtarı).
  Model Serdar'ın gerçek Whiteout raporlarından ÖLÇÜLEREK çıkarıldı
  (`savas2.js` bağımsız doğrulama modülü, oyuna bağlı değil: iki
  kontrollü canavar savaşını %1 ve %0 sapmayla yeniden üretiyor).
  Üç mekanizma:
  1. **Savunma asker başına emer** (toplam değil). Eskiden savunanın
     askeri çoğaldıkça emilim saldıranın toplam saldırısını geçiyor ve
     hasar `minDamagePct` tabanına çakılıyordu; kalite bir yerden sonra
     hiç işe yaramıyordu.
  2. **Temas sınırı** (`temasSiniri`, 50.000): aynı anda sınırlı sayıda
     asker vurur, fazlası arkada bekler. Kalabalık hasarı katlamaz,
     yalnız daha uzun dayanır.
  3. **Üçlü kayıp**: Kayıp / Yaralılar / **Hafif Yaralı**. Hafif yaralı
     orduya bedava döner (hastane yok, güç kaybı yok). Pay savaşın
     çekişmesine göre %92 → %45. Bozgun eşiği ve tip tabanı yeni
     motorda KAPALI — yumuşatmayı artık bu pay yapıyor.
  **Rapor artık BEŞ satır**: BİRLİKLER · ÖLEN · YARALANAN ·
  **HAFİF YARALI** · HAYATTA KALANLAR. Hafif satırı yalnız değer
  varsa çizilir, eski raporlar aynen görünür (`tema.js ozetHTML`).
  ÖLÇÜM — kalitenin yenebildiği sayı farkı: **2,5 kat → 26,8 kat**.
  `hafifTaban` 0,45 → **0,70** (canlı savaştan sonra düzeltildi):
  0,45 ile umutsuz saldırı ESKİSİNDEN pahalı çıkıyordu — 74.035
  askerle 20 milyona saldırıda kalıcı kayıp 40.719 oldu, eski bozgun
  eşiğiyle ~22.210 olurdu. 0,70 ikisini eşitler; kazanılan savaşlar
  etkilenmez (orada `hafifTavan` geçerli).
  Saldırmanın bedeli: 2M→1M savaşında kalıcı kayıp 537.788 → 201.138.
  Savaş süresi 20–83 ms (telefonda sorun değil).

  **KÖK TUZAK (bu turda ısırdı):** `rollDamage`'da `paylar` hesabı
  `raw`a bölünüyor ve toplamı 1 olmalı — `damageArmy` hasarı bu paylara
  bölerek uyguluyor. Temas sınırı için `raw`ı kırpınca paylar toplamı
  1'i aştı (20M'lik savunanda 533 çıktı) ve kırptığım hasar 533 katına
  çıkarak geri geldi: 34.545 kişilik ordu tek turda siliniyordu, üstelik
  sınır ne olursa olsun sonuç değişmiyordu (kırpma kendini iptal
  ediyordu). Paylar artık HAM saldırıdan (`armyAtk`) hesaplanıyor.
  Bölen değiştireceksen paylar toplamının 1 kaldığını DOĞRULA.

- **Savaş dengesi: bozgun eşiği artık güç farkına göre.** Ölçüldü:
  kaybeden taraf, farkın ne olduğuna bakmadan HEP ordusunun %75'ini
  kaybediyordu (34 bin asker de, denk ordu da). Artık zayıf ordu daha
  erken dağılır: güç oranı 1,00 → %25 kalınca (eskisi gibi), ~0 →
  %70 kalınca. `CFG.routPct` + yeni `CFG.routPctZayif`, eşitlersen
  eski davranışa döner. Ölçüm (savunanda 1M, 7'şer deneme):
  10 bin orduda kayıp 7.500 → 3.029 · 100 bin: 75.000 → 32.864 ·
  denk: 750.000 → 586.364. **Kazanma oranları değişmedi** (0/0, 7/7),
  rakibin kaybı küçük ordularda aynı kaldı. Yan etki: çok güçlü
  saldırgan zayıf savunanı artık komple silemiyor (1.000.000 → 588.571)
  — kural iki tarafa da işliyor.
- **Buz Engelleri (Buz Savaşçısı) yeniden yazıldı.** Eskiden GARANTİ
  çalışıp savaşın İLK turuna işliyordu; savaş tek turda bitince
  saldıran hiç vuramıyor ve raporda "0 ölü / 0 yaralı" çıkıyordu
  (7/7 ölçüldü, oyuncu bunu bozukluk sandı). Artık **%25 ihtimalle**
  ve **ilk tura işlemez** → 0/7. Süre ve ihtimal `effect` içinde
  (`chance:25, turns:1`), `valuesByLevel`/`chanceByLevel` silindi.
  Açıklamada yalnız ihtimal yazıyor, tur sayısı hiçbir yerde
  gösterilmiyor. Zar savaş başında BİR kez atılır; tutmazsa rapor da
  yeteneğin çalıştığını yazmaz. `gelistir.js` kartı sabit ihtimali
  `effect.chance`ten okuyor (yoksa satır hiç basılmıyordu).

- **PvP savaş raporları açılmıyordu** (eski hata, bu turda bulundu).
  `posta.js` PvP raporu için İKİ kapı arıyor:
  `openReportModal` **ve** `entryToReport`. `tema.js`'te yalnız
  birincisi dışa açılmış, `entryToReport` IIFE içinde kalmıştı →
  ikinci şart hep düşüyor, "📜 Savaş Raporunu Aç" hiçbir şey
  yapmıyordu. Yedek uyarı `showToast` ile veriliyordu, bildirimler
  kapalı olduğu için (Tuzak 9) hata **tamamen sessizdi**.
  Düzeltme: `window.entryToReport = entryToReport;` + yedek uyarı
  `showToastForce`a çevrildi. PvE/canavar raporları etkilenmemişti
  (onlar `openLogReportModal` üzerinden gidiyor, o zaten window'da).

- **Eğitim teslimatı oyuncuya geçti.** Süresi dolan parti artık kendiliğinden
  orduya katılmıyor: kışlasının üstünde birliğin kafa kutucuğu baloncuk olarak
  belirir, dokununca teslim alınır ve ekranın ortasında `✊ Güç +N` şeridi
  büyüyerek girip saydamlaşarak kaybolur.
  - Teslimatın TEK kapısı `index.html egitimTopla(aile)`;
    `egitimHazir(aile)` sorar, `egitimPartiBitisleri()` parti kuralını
    tek yerde hesaplar. `applyFinishedTraining()` artık hiçbir şey
    teslim etmez, yalnız "bekleyen var mı" döner (onlarca çağıran var).
  - **state'e yeni alan yazılmadı**: "hazır" olmak o türün son işinin
    `finishAt`inin geçmiş olmasıdır — türetilen durum, bu yüzden
    `compactStateForExport` dokunulmadı (Tuzak 7), eski kayıtlar çalışır.
  - **Kışla rozetinin iki durumu var**, veri tek sorgudan:
    `egitimDurum(aile)` → `uretim` (kafa kutucuğu + `ss:dd:sn` geri
    sayım + ilerleme çizgisi) ya da `hazir` (dokunulunca toplanan
    baloncuk).
  - Rozet `kaleici.js` tuvalinde çizilir (`BALON` ayar tablosu).
    **Kafa kutucuğu oyundaki kutucuğun aynısı**: kademe arka planı
    (`birlikNarkaplan.webp`, Sv6 kasten yok) + `--tp-kp-*` /
    `--tp-ap-*` / `--tp-rp-*` kadrajı + köşede kademe numarası.
    İkinci kadraj ya da ikinci arka plan tablosu açılmadı.
  - **Kayma önlemi:** rozet binalarla AYNI karede, aynı kamera
    hesabıyla çiziliyor (Tuzak 30) — ölçüldü, kaydırmada binaya göre
    bağıl kayma 0,000 px. Geri sayım şeridinin eni metne göre değil
    `00:00:00`a göre ölçülüyor: rakam değişirken şerit kıpırdamıyor
    (oyunun `sureBicim`i sabit genişlikte değil, o yüzden burada
    kullanılamadı).
  - Şerit ayrı dosyada: `gucefekt.js` → `GUC_EFEKT.goster(miktar)`.
    Hareketin tamamı `requestAnimationFrame` (Tuzak 11), konum iki ayrı
    `translate()` (Tuzak 12).
  - İkinci giriş: kuyruk ve kademe ekranındaki sayaç, süre bitince
    `✅ Teslim Al`a döner — aynı `.speedup-trigger` dinleyicisi
    `egitimTopla`ya çevirir, ikinci teslimat yolu açılmadı.
  - Kök tuzak kapatıldı: yeni sipariş kuyruğun ARKASINA eklendiği için
    bekleyen parti bir daha hazır sayılmazdı → `trainUnit` ve `terfiEt`
    yeni işi yazmadan önce bekleyeni teslim alıyor.

## 29'da yapılanlar

- Mağaza kalkanı `SHOP_LIMITS`'e girdi → **haftalık 10 adet**.
- Sohbet şeridi kaleiçinde de görünüyor (`z-index:40`); koordinat kutusu gizli.
- Sohbet penceresi sadeleşti: üst şerit %75, başlık `SOHBET` ortada,
  mesaj kutucukları ince ve geniş (%94), alt şerit kalktı, tümü Baloo 2.
- Üst ve alt menüdeki çerçeve kalktı (`border:none`).
- Elmas görseli + yer başına ölçü sistemi + `?elmasayar=1` paneli.

## Sıradaki iş

0. **Birlik ekranı BÖLÜM 2** — altıgen kademe rozetleri, kaynak
   kutusu 2×2, Bitir/Eğit düğme rengi, ölü `stat-row` CSS'i.
1. **`?botkale=1` deneme kalelerini SİL** (`index.html
   denemeKaleleriHTML`). Kale hizası işi bitti, blok geçiciydi.
2. **`kale2.webp` / `kale3.webp`** diğer seviyelerle açı olarak
   uyumsuz — yeni görsel arayışı sürüyor.
3. **Kahraman detayının `z-index`i 400**, öbür paneller 50. "Üstüne
   hiçbir şey binemiyor" hissi buradan; hizalanacaksa ayrı karar.
4. **Etiket panelinin DÜĞÜM (%) bölümü** hiç işlenmedi
   (`harita.js CFG.etiket`).
5. **Bozgun eşiği + `hafifTaban`** birlikte tekrar gözden geçirilebilir.
6. **Mağazanın satın alma penceresi** (`.bd-buy-mask`) hâlâ eski
   model: ekranın ortasında açılan pencere. Bilgi baloncukları
   çanta kalıbına geçti, satın alma akışı geçmedi.
7. **Elmas B grubu** — `textContent` ile yazılan altı yer (Tuzak 23).
   Eğitim düğmeleri en kritiği: işaretleme ve güncelleme birlikte düzeltilmeli.
8. `?elmasayar=1` panelini sil — `tasima`, `rehber` ayarlandıktan sonra.
   **`canta` satırı zaten ölü:** çantanın elmas özet kutusu kalktı,
   o satırın sürdüğü `::before` artık yok.
9. Elmas görseli kırpılma denetimi: mağaza kartları, inşaat düğmeleri, kahraman listesi.
10. `egitim.js savasZinciri()` oyunda sınansın; çalışmıyorsa kaldır. Bitişte
   Revolia kapanış paneli yazılmadı.
11. `tema.js` CSS ezme temizliği: enjeksiyonlara `id` ver → listele → değerleri
   eşitle → eskileri sil → `menuGirisDuzles` yamasını kaldır.
12. JetBrains Mono'yu ayıkla (30+ satır). **Toplu değiştir-bas yapma.**
13. `mizrakci.webp` eksik (Koruyucu Sv1 boş). Arka planı renk **eşiğiyle** değil
   renk **oranıyla** ayır.
14. İnşaat dengesi ve sefer kapasitesi rakamları oyunla sınanmadı.
15. Araştırma binası seviyeleniyor ama seviyesi hiçbir şeye bağlı değil.
16. Terfi sistemi yok (Sv2+ edinilemez) · tedavi süresi ordu ölçeğinde saçmalıyor ·
    sıralama tüm `accounts`'u çekiyor · `kale2x2.js` bağlanmadı · Blaze +
    Cloud Functions ile sunucu tarafı sefer.

**Yapısal sınır:** hasar kendi ordu büyüklüğüyle orantılı, 2 kat ordu 4 kat
etkili. Motoru baştan yazmadan 1x→1.25x uçurumu kapanmaz. Çember bunu kırmaz,
yalnız tek aileye yığmayı cezalandırır. Asıl fren sefer kapasitesi tavanı.

## Sabitler (koddan doğrulandı)

- Kale taşıma **20.000 💎** (`index.html MOVE_COST`) · bitirme **dakika başına
  20 💎** (`BITIR_ELMAS_DK`, `insaat.js BITIR_DK_ELMAS` ile aynı olmalı)
- Kalkan 6 saat · 10.000 💎 · haftalık 10 adet
- Sefer kapasitesi tabanı 5.000 (`TABAN_KAPASITE`) · günlük sınır 70 (`GUNLUK_SINIR`)
- İntikal karo başına 5,3 sn, alt sınır 15 sn
- Harita `grid 141` · `tileW 64 / tileH 32` · zoom `0.75–3.0`, açılış `1.6`
- Hoş geldin 5.000.000 💎 · günlük giriş 50.000 💎 + parça · 17:00 keşif 50.000 💎

## Sürümler (koddan okundu)

`kaleici-58` · `insaat-15` · `uretim-3` · `karo-3` · `kale2x2-1` ·
`SEFER.SURUM canvas-11` · `DUGUM.SURUM canvas-4-varis` · `BUFF.SURUM 2` ·
`gucefekt-2` · `kalkanrozet-3` · `profil-1` · `istatistik SURUM 2` · `birlik.js v1` (**yüklenmiyor** — `index.html`'de yok)

**Tam ekran olan paneller:** çanta (`#panel-inventory`) · market
(`#panel-shop`) · kahraman listesi ve detayı (`HERO_UI.kartTamEkran`) ·
birlik eğitim ekranları (`#panel-troops`, üç aile birden) · şehir bonusu (`#sehirBonusu`).
Hastane ve sandık hâlâ dört yanı boşluklu kart.

**Denetim betiği:** `tuzak27.py` — şablon dizgisi içindeki yorumlarda
ters tırnak arar (30'da yeniden yazıldı: eski düzenli ifade sürümü
aradığı karakterin kendisi yüzünden kör kalıyordu) (`tema.js` · `magaza.js` · `buff.js` ·
`kahramanlar.js` · `heroes.js`). Bu tur dört kez dosya çökertti.

Yükleme sırası (`index.html` sonu): koordinat · heroes · kahramanlar · gelistir ·
troops · istatistik · missile · pvp · pve · tema · rehber · harita · dugum ·
sefer · karo · kale2x2 · temizle · uretim · insaat · **gucefekt** · kaleici · egitim ·
three.js · magaza · buff · **kalkanrozet** · **profil**.
