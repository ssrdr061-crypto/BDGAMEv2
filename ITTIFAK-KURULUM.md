# İttifak Kurulumu — "PERMISSION_DENIED" Düzeltmesi

Bu dosya **tek bir sorunu** çözer: İttifak panelinde *"İttifak Kur · 💎 400"*
düğmesine basınca çıkan **`Kurulamadı: PERMISSION_DENIED`** hatası.

---

## Sorun kodda değil, veritabanı kurallarında

`ittifak.js` doğru çalışıyor. Hata, Firebase Realtime Database'in
**güvenlik kuralları** katmanından geliyor:

> Realtime Database'de **hiçbir kuralın kapsamadığı** bir düğüme yazma
> denemesi varsayılan olarak **reddedilir.**

Oyun `ittifaklar/{etiket}` düğümüne yazmaya çalışıyor, ama senin
kurallarında `ittifaklar` diye bir blok yok. Bu yüzden yazma daha
sunucuya ulaşmadan düşüyor.

Bu, `ittifak.js`'in kendi başlığında zaten yazılıydı (satır 34–37):

```
DİKKAT — FIREBASE KURALI
`database.rules.json`'a `ittifaklar` düğümü ... eklenmezse
yazma SESSİZCE reddedilir.
```

**Kuralları koddan değiştiremem** — onlar repoda değil, Firebase
Console'da duruyor. Aşağıdaki adımı bir kez senin yapman gerekiyor.

---

## Yapılacak (2 dakika)

1. <https://console.firebase.google.com> → **ejderha-1ce83** projesi
2. Sol menü: **Realtime Database** → üstteki **Rules (Kurallar)** sekmesi
3. Ekranda duran kuralları **SİLME.** Sadece en dıştaki `{ }` içine,
   var olan blokların yanına `ittifaklar` bloğunu ekle.
4. Bloğun içeriği bu repodaki **`ittifak-kurallari.json`** dosyasında.
5. **Publish (Yayınla)** düğmesine bas.

### Nereye ekleneceği — örnek

Kuralların şuna benziyorsa:

```json
{
  "rules": {
    "accounts": { ... },
    "castles":  { ... },
    "chat":     { ... }
  }
}
```

`ittifaklar` bloğu **`"rules"` düğümünün içine**, kardeş olarak girer:

```json
{
  "rules": {
    "accounts": { ... },
    "castles":  { ... },
    "chat":     { ... },

    "ittifaklar": {
      ... ittifak-kurallari.json içeriği buraya ...
    }
  }
}
```

> ⚠️ `ittifak-kurallari.json` dosyasının en dışındaki `{ }` süslü
> parantezini **alma** — sadece `"ittifaklar": { ... }` kısmını kopyala.
> Yoksa iç içe fazladan bir seviye oluşur ve kural çalışmaz.

---

## Neden kuralların tamamını hazır vermedim

Çünkü bu, oyunun geri kalanını kırabilirdi.

Kodu okurken şunu buldum (`index.html:9214`): kayıt olurken
`fetchAccountFromCloud()` çağrılıyor ve bu, **`authKayit()`'ten
ÖNCE** `accounts` düğümünü okuyor. Yani o anda oyuncu **henüz giriş
yapmamış** oluyor.

Sana "hepsini şununla değiştir" deyip `accounts` için
`".read": "auth != null"` yazsaydım, **yeni kayıt akışı bozulurdu** —
"bu kullanıcı adı alınmış mı" kontrolü sessizce çalışmaz hâle gelirdi.

Senin mevcut kurallarını göremediğim için (Console'da duruyorlar,
repoda değiller) körlemesine toptan bir set vermek doğru olmazdı.
Bu yüzden sadece **eklenecek** parçayı hazırladım.

---

## Kuralın ne yaptığı

| Ne | Kim |
|---|---|
| İttifak listesini **okumak** | Herkes (giriş yapmamışlar dahil) |
| İttifak **kurmak / katılmak / başvurmak** | Giriş yapmış oyuncu |
| Rütbe verme, üye atma, dağıtma | Giriş yapmış oyuncu — yetki denetimi **istemcide** |

### Neden "yalnız kurucu dağıtabilir" kuralı yok

Önce yazdım, sonra **ölçüp kaldırdım.** Kural şöyle olacaktı: silme
isteğini gönderenin rütbesi `kurucu` mu diye bak. Gönderenin kimliği
Firebase'de `auth.token.email` ile bilinir ve bu e-posta
`toFirebaseKey(ad) + "@bdgame.local"` biçiminde üretiliyor — yani
üye anahtarıyla eşleşmesi gerekirdi.

Eşleşmiyor:

| Kullanıcı adı | Üye anahtarı | Kuraldan çıkan | |
|---|---|---|---|
| `Ahmet` | `ahmet` | `ahmet` | ✅ |
| `Ayşe` | `ay%C5%9Fe` | `ay%c5%9fe` | ❌ |
| `Gökhan` | `g%C3%B6khan` | `g%c3%b6khan` | ❌ |
| `İbrahim` | `i%CC%87brahim` | `i%cc%87brahim` | ❌ |

Sebep: `encodeURIComponent` **büyük** harfli hex üretiyor (`%C5`),
Firebase ise e-postaları **küçük** harfe indiriyor (`%c5`).

Yani bu kural ASCII adlarda çalışır, **Türkçe karakterli her adda
"İttifakı Dağıt" düğmesini sessizce kilitlerdi.** Türkçe bir oyunda
bu, oyuncuların çoğu demek.

**Kabul edilen risk:** giriş yapmış bir oyuncu, tarayıcı konsolundan
ham Firebase çağrısı yazarak başkasının ittifakını silebilir. Oyunun
arayüzünden bu mümkün değil. Bu takas bilinçli yapıldı; gerçek çözüm
üye anahtarını e-postadan türetilebilir hâle getirmek (ya da Firebase
`uid` kullanmak) olurdu, o da hesap sisteminin tamamına dokunur.

Okumanın herkese açık olması bilerek: sayfa yenilendiğinde Firebase'in
oturumu geri yüklemesi asenkron, o birkaç yüz milisaniyede `auth`
hâlâ `null` görünüyor. Sıralama paneli tam o anda açılırsa liste boş
kalırdı. İttifak adı zaten gizli bilgi değil.

Alan doğrulamaları **bilerek gevşek** tutuldu ve `"$other": false`
**konmadı.** Sebep bu projenin kendi geçmişi: `castles/` altında
alanları tek tek sayan kurallar yüzünden daha önce iki kez
`PERMISSION_DENIED` yaşanmış (`index.html` → `publishCastle()`
yorumlarında yazıyor — yeni `sv` ve `kb` alanları eklenince TÜM yazma
düşüyordu). Aynı tuzağa bir daha düşülmesin diye ittifak kuralı,
yarın yeni bir alan eklenirse yazmayı reddetmeyecek şekilde yazıldı.

---

## Kurulumdan sonra test

1. Oyunu aç, giriş yap
2. Alt menü → **🤝 İttifak** → *İttifak Kur*
3. Ad (3–16 harf) + Etiket (2–4 harf) yaz → **İttifak Kur · 💎 400**
4. Beklenen: `🤝 <ad> kuruldu!` bildirimi, 400 elmas düşer
5. Sağ alt **🏆 kupa** → **İTTİFAK** sekmesi → ittifakın listede görünür

---

## Sorun çıkarsa nereye bakılır

**Hâlâ `PERMISSION_DENIED`**
→ Publish'e basılmamış olabilir, ya da blok `"rules"` yerine en dışa
konmuş olabilir. Console'daki kural metnini kontrol et.

**Kuruluyor ama katılma / atma / dağıtma izin vermiyor**
→ `.write` kuralı `auth != null` diyor. Oyuncunun Firebase oturumu
düşmüş olabilir (çıkış yapıp tekrar giriş dene). Kalıcıysa
`ittifak-kurallari.json` içindeki alan doğrulamalarından biri
takılıyordur — tarayıcı konsolundaki `[ittifak]` uyarısına bak.

**İttifaka girdikten sonra oyun ilerlemesi buluta kaydolmuyor**
→ Bu ayrı bir kural sorunudur. `ittifak.js` oyuncu tarafına
`state.ittifak` diye yeni bir alan yazıyor. Eğer `accounts` kuralların
`state` altında `"$other": { ".validate": false }` içeriyorsa, bu yeni
alan **tüm hesap kaydını** reddettirir. Belirtisi: oyun çalışır ama
sadece o cihazda kalır (konsolda `Buluta kaydedilemedi` uyarısı).
Çözüm: `state` altındaki `"$other": false` satırını kaldır.

**İttifak sıralaması boş / herkes 0 güç**
→ Üye anahtarı ile hesap anahtarı eşleşmiyordur. İkisi de
`toFirebaseKey(oyuncuAdı)` üretir; bu fonksiyon değişirse eşleşme
bozulur. Bakılacak yer: `tema.js` → `ittifakGucleri()`.
