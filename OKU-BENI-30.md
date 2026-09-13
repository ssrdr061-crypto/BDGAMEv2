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
`gucefekt-2` · `istatistik SURUM 2` · `birlik.js v1` (**yüklenmiyor** — `index.html`'de yok)

Yükleme sırası (`index.html` sonu): koordinat · heroes · kahramanlar · gelistir ·
troops · istatistik · missile · pvp · pve · tema · rehber · harita · dugum ·
sefer · karo · kale2x2 · temizle · uretim · insaat · **gucefekt** · kaleici · egitim ·
three.js · magaza · buff.
