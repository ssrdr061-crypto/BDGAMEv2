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
10. `state` `const` → `window.state` hep `undefined`;
    `typeof state !== "undefined"` ile koru.
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

`kaleici-55` · `insaat-15` · `uretim-3` · `karo-3` · `kale2x2-1` ·
`SEFER.SURUM canvas-11` · `DUGUM.SURUM canvas-4-varis` · `BUFF.SURUM 2` ·
`istatistik SURUM 2` · `birlik.js v1` (**yüklenmiyor** — `index.html`'de yok)

Yükleme sırası (`index.html` sonu): koordinat · heroes · kahramanlar · gelistir ·
troops · istatistik · missile · pvp · pve · tema · rehber · harita · dugum ·
sefer · karo · kale2x2 · temizle · uretim · insaat · kaleici · egitim ·
three.js · magaza · buff.
