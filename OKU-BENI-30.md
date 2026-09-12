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

1. **Elmas B grubu** — `textContent` ile yazılan altı yer (Tuzak 23).
   Eğitim düğmeleri en kritiği: işaretleme ve güncelleme birlikte düzeltilmeli.
2. `?elmasayar=1` panelini sil — `tasima`, `rehber`, `canta` ayarlandıktan sonra.
3. Elmas görseli kırpılma denetimi: mağaza kartları, inşaat düğmeleri, kahraman listesi.
4. `egitim.js savasZinciri()` oyunda sınansın; çalışmıyorsa kaldır. Bitişte
   Revolia kapanış paneli yazılmadı.
5. `tema.js` CSS ezme temizliği: enjeksiyonlara `id` ver → listele → değerleri
   eşitle → eskileri sil → `menuGirisDuzles` yamasını kaldır.
6. JetBrains Mono'yu ayıkla (30+ satır). **Toplu değiştir-bas yapma.**
7. `mizrakci.webp` eksik (Koruyucu Sv1 boş). Arka planı renk **eşiğiyle** değil
   renk **oranıyla** ayır.
8. İnşaat dengesi ve sefer kapasitesi rakamları oyunla sınanmadı.
9. Araştırma binası seviyeleniyor ama seviyesi hiçbir şeye bağlı değil.
10. Terfi sistemi yok (Sv2+ edinilemez) · tedavi süresi ordu ölçeğinde saçmalıyor ·
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
`gucefekt-1` · `istatistik SURUM 2` · `birlik.js v1` (**yüklenmiyor** — `index.html`'de yok)

Yükleme sırası (`index.html` sonu): koordinat · heroes · kahramanlar · gelistir ·
troops · istatistik · missile · pvp · pve · tema · rehber · harita · dugum ·
sefer · karo · kale2x2 · temizle · uretim · insaat · **gucefekt** · kaleici · egitim ·
three.js · magaza · buff.
