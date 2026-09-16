# İttifak Kurulumu — "PERMISSION_DENIED" Düzeltmesi

Bu dosya tek bir sorunu çözer: İttifak panelinde *"İttifak Kur · 💎 400"*
düğmesine basınca çıkan **`Kurulamadı: PERMISSION_DENIED`** hatası.

---

## Sorun kodda değil, veritabanı kurallarında

`ittifak.js` doğru çalışıyor. Hata Firebase Realtime Database'in
**güvenlik kuralları** katmanından geliyor:

> Realtime Database'de **hiçbir kuralın kapsamadığı** bir düğüme yazma
> denemesi varsayılan olarak reddedilir.

Oyun `ittifaklar/{etiket}` düğümüne yazmaya çalışıyordu ama kurallarda
`ittifaklar` diye bir blok yoktu. Bu yüzden yazma daha sunucuya
ulaşmadan düşüyordu. (`ittifak.js` bunu kendi başlığında not etmiş
ama kural hiç eklenmemiş.)

---

## Yapılacak (2 dakika)

1. <https://console.firebase.google.com> → **ejderha-1ce83** projesi
2. Sol menü: **Realtime Database** → üstteki **Rules (Kurallar)** sekmesi
3. Ekrandaki metnin **tamamını sil**, bu repodaki
   **`firebase-kurallari.json`** dosyasının içeriğini yapıştır
4. **Publish (Yayınla)**

`firebase-kurallari.json` senin mevcut kurallarının **birebir aynısı**
artı `ittifaklar` bloğu. Başka hiçbir düğüme dokunulmadı — bu makine
üzerinde eski ve yeni hâl karşılaştırılarak doğrulandı:

```
Mevcut kurallarda degisiklik: YOK  ✓
Eklenen: ['ittifaklar']
```

---

## Eklenen blok ne yapıyor

| Ne | Kim |
|---|---|
| İttifakları okumak | Herkes (kök `".read": true` zaten veriyordu) |
| Kurmak / katılmak / başvurmak / atmak / dağıtmak | Herkes |

`.write` bilerek `true` yapıldı, `auth != null` **değil.** Sebep: senin
kurallarının tamamı (`accounts`, `castles`, `chat`, `pvp`, `dugumler`…)
kimlik doğrulaması istemiyor. Yalnızca `ittifaklar`'a auth şartı
koysaydım, bütün oyunda olmayan yeni bir hata biçimi doğardı —
Firebase oturumu tazelenmemiş bir oyuncuda ittifak çalışmaz, ama
oyunun geri kalanı çalışırdı. Teşhisi en zor hata türü budur.

Rütbe denetimi (kimi kim atabilir, kim dağıtabilir) **istemcide**
yapılıyor — zaten `ittifak.js` içinde var.

---

## Kural yazarken bulunan iki tuzak

### 1. `adKucuk` uzunluğu — Türkçe'de büyüyor

`adKucuk` alanı `ad.toLowerCase()` ile üretiliyor. Türkçe'de bu işlem
metni **uzatabiliyor**:

| Ad | `toLowerCase()` | Uzunluk |
|---|---|---|
| `İTTİFAK` | `i̇tti̇fak` | 7 → **9** |
| `İSTANBUL` | `i̇stanbul` | 8 → **9** |

Sebep: `İ` küçültülünce `i` + ayrı bir birleşen nokta (U+0307) oluyor.
16 harflik bir ad `adKucuk`'te **32 karaktere** çıkabiliyor.

`ad` gibi `adKucuk`'e de 16 sınırı koysaydım, Türkçe adlı ittifaklar
sessizce reddedilirdi. Sınır **48** yapıldı.

### 2. "Yalnız kurucu dağıtabilir" kuralı yazılamıyor

Bu güvenlik kuralını önce yazdım, sonra ölçüp kaldırdım. Gönderenin
kimliği `auth.token.email` ile bilinir ve bu e-posta
`toFirebaseKey(ad) + "@bdgame.local"` biçiminde üretiliyor — üye
anahtarıyla eşleşmesi gerekirdi. Eşleşmiyor:

| Kullanıcı adı | Üye anahtarı | Kuraldan çıkan | |
|---|---|---|---|
| `Ahmet` | `ahmet` | `ahmet` | ✅ |
| `Ayşe` | `ay%C5%9Fe` | `ay%c5%9fe` | ❌ |
| `Gökhan` | `g%C3%B6khan` | `g%c3%b6khan` | ❌ |

`encodeURIComponent` **büyük** harfli hex üretiyor (`%C5`), Firebase
e-postaları **küçük** harfe indiriyor (`%c5`). Bu kural ASCII adlarda
çalışır, **Türkçe karakterli her adda "İttifakı Dağıt" düğmesini
sessizce kilitlerdi.**

---

## `$other` neden yok

`castles`, `dugumler`, `chat` bloklarında `"$other": { ".validate": false }`
var — yani "listede olmayan alan yazılamaz". `ittifaklar`'a bilerek
**konmadı.**

Sebep bu projenin kendi geçmişi: `index.html` içindeki `publishCastle()`
yorumları, `castles/` altına yeni `sv` ve `kb` alanları eklenince TÜM
yazmanın `PERMISSION_DENIED` ile düştüğünü ve bunun aylarca yanlış
yerde arandığını anlatıyor. `ittifak.js` başlığı da 2. aşamada yeni
alanlar geleceğini söylüyor (ittifak bonusları, bölge, davet). Aynı
tuzağa düşülmesin diye alan listesi kapatılmadı.

---

## Doğrulama

Kural metni, `ittifak.js`'in yaptığı **her yazma** ile simüle edildi
(25 senaryo, hepsi geçti):

- İzin verilmeli (13): kurma (ASCII + Türkçe ad), katılma, başvuru,
  onay, subay yapma, üye atma, ayrılma, dağıtma, boş manifesto,
  tam 120 karakter manifesto
- Reddedilmeli (6): kısa ad, uzun etiket, geçersiz rütbe, 121 karakter
  manifesto, geçersiz katılım biçimi, eksik zorunlu alan
- Regresyon (6): `castles`, `accounts` (+`state.ittifak`), `chat`,
  `dugumler`, `seferler`, `kaleYerlesim` yazmaları hâlâ çalışıyor

---

## Kurulumdan sonra test

1. Oyunu aç, giriş yap
2. Alt menü → **🤝 İttifak** → *İttifak Kur*
3. Ad (3–16 harf) + Etiket (2–4 harf) → **İttifak Kur · 💎 400**
4. Beklenen: `🤝 <ad> kuruldu!`, 400 elmas düşer
5. Sağ alt **🏆 kupa** → **İTTİFAK** sekmesi → ittifakın listede

---

## GÜNCELLEME — Savaş · Sandıklar · Mağaza ekranları

İttifak künyesindeki ızgaranın üç düğmesi (**Savaş**, **Sandıklar**,
**Mağaza**) artık gerçekten çalışıyor. Bunlar `ittifaklar/{id}` altına
**üç yeni düğüm** yazıyor:

| Düğüm | Ne tutar |
|---|---|
| `sayac` | `{ anahtar, tec }` — sandık çubuğu ve ittifak tecrübesi |
| `sandiklar` | Ganimet Sandığı / İttifak Hediyesi kayıtları |
| `carpismalar` | Savaş ekranındaki çağrılar (henüz üreten sistem yok) |

**Kuralları yeniden yapıştırman gerekiyor.** `firebase-kurallari.json`
bu üç düğümün doğrulamasını içeriyor; eski kurallar yayındayken
sandık toplama ve mağaza ilerlemesi **sessizce** düşer (konsolda
`[ittifak]` uyarısı çıkar, ekranda hiçbir şey olmaz).

Adımlar yukarıdakinin aynısı: Console → Realtime Database → Rules →
metnin tamamını `firebase-kurallari.json` ile değiştir → Publish.

> Teknik not: `ittifaklar/$id` bloğunda `"$other": { ".validate": false }`
> **yok**, bu yüzden eski kurallar bu düğümleri reddetmez — ama
> doğrulamaz da. Kuralları güncellemek, bozuk bir kaydın (örneğin
> negatif jeton) buluta yazılmasını engeller.

### Ekonomi nasıl işliyor

İttifak ilerlemesi **asıl olarak ücretli paketlere** aittir. İki kaynak var:

| Kaynak | Oran | Hediye sandığı |
|---|---|---|
| **Ücretli paket** (gerçek para) | Bedelin tamamı | **Evet**, tüm üyelere |
| **Oyun içi elmas** (mağaza alışverişi) | Bedelin **%10**'u | Hayır |

Elmasın tam oranla sayılmaması bilinçli: elmas zaten oyun içinden
kazanılıyor, tam saymak ittifak seviyesini tek kuruş ödemeden tavana
taşırdı.

Sayaca yazılan miktar iki yere birden gider:

1. `sayac.tec` → künyedeki **seviye çubuğu**. Seviye, İttifak
   Mağazası'ndaki kilitli satırları açar (Sv. 5 ve Sv. 7).
2. `sayac.anahtar` → **Sandıklar** ekranının tepesindeki çubuk.
   75.000'e varınca sıfırlanır ve **tüm üyelere** bir Ganimet Sandığı
   düşer — kaynağı ne olursa olsun.

Ücretli paket ayrıca **tüm üyelere** bir İttifak Hediyesi açar;
içindeki jeton bedele göre değişir (bedel ÷ 100, en az 10, en çok 300).

> **Ücretli satın alma sistemi oyunda HENÜZ YOK** — ne IAP ne ödeme
> sağlayıcısı. `ITTIFAK.paketAlindi(paketAdi, bedel)` kapısı bilerek
> açık duruyor: o sistem kurulduğunda satın alma **başarıyla bittiği
> yerden** bu işlevi çağırmak yeterli, sandık/jeton/seviye/mağaza
> tarafında hiçbir şey değişmez.

Sandık kaydı **tektir**: 50 üyeye 50 kayıt açılmaz, her üye
`sandiklar/{id}/toplayan/{oyuncuAnahtari}` altına kendini yazarak
bir kez toplar.

Toplanan **İttifak Jetonu** oyuncunun kendi kaydında durur
(`state.ittifakJeton`) ve yalnız İttifak Mağazası'nda harcanır.
Sayılar tek yerde: `ittifak.js` → "İTTİFAK EKONOMİSİ" bloğu.

---

## Sorun çıkarsa

**Hâlâ `PERMISSION_DENIED`**
→ Publish'e basılmamış olabilir. Console'daki metni kontrol et.

**"Ad/etiket geçersiz" gibi bir ret**
→ Alan doğrulamalarından biri takılıyordur; tarayıcı konsolunda
`[ittifak]` uyarısına bak.

**İttifak sıralaması boş / herkes 0 güç**
→ Üye anahtarı ile hesap anahtarı eşleşmiyordur. İkisi de
`toFirebaseKey(oyuncuAdı)` üretir. Bakılacak yer: `tema.js` →
`ittifakGucleri()`.

---

## Ayrı bir konu: güvenlik

Bu düzeltmenin parçası değil, ama kuralları okurken görüldü:
`accounts/$key` yazması **kimlik doğrulaması istemiyor**
(`".write": "newData.exists()"`). Yani teknik olarak herhangi biri
başka bir oyuncunun hesabının üzerine yazabilir.

Bunu **bu sürümde düzeltmedim**, çünkü doğru düzeltme oyunun kayıt
akışına dokunuyor: `index.html:9214`'te `fetchAccountFromCloud()`,
`authKayit()`'ten **önce** `accounts` okuyor — yani kayıt anında
oyuncu henüz giriş yapmamış oluyor. Kuralı körlemesine sıkılaştırmak
yeni kayıt akışını bozardı. Ele almak istersen ayrı bir iş olarak
bakalım.
