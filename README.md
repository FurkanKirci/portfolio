# MFK · Açılıştan kapanışa

Muhammed Furkan Kırcı'nın portfolyosu. Site, bir bilgisayarın açılıştan kapanışa kadarki ömrünü tek sayfada, kaydırdıkça ilerleyen bir film gibi anlatır. Kart karanlıkta bekler. Güç düğmesine basılı tutunca saat sinyali başlar, bellek eğitilir, POST geçilir ve kamera silikonun içine dalar. Bölümler, sistemin o anki aşamasının içinde durur.

| Kod  | Komut                 | Bölüm      | Sahne                                          |
| ---- | --------------------- | ---------- | ---------------------------------------------- |
| 0x00 | açılış                | Kahraman   | Anakart (MFK-B26), saat, Q-Code, POST          |
| 0x01 | `post`                | Hakkımda   | Kalıbın içi: gece şehri gibi silikon           |
| 0x02 | `lsmod`               | Yetenekler | Her çekirdek bir kule, modüller yükleniyor     |
| 0x03 | `ps --forest`         | Projeler   | CPU zamanlayıcı şeritleri, her proje bir süreç |
| 0x04 | `dmesg --follow`      | Deneyim    | Mantık analizörü, zaman imleci ilerliyor       |
| 0x05 | `traceroute`          | Yolculuk   | Gerçek yükselti verisiyle Türkiye              |
| 0x06 | `shutdown -h now`     | İletişim   | Kapanış, CRT sönmesi ve çalışan bir form       |

Gezinme hibrittir: kaydırınca film akar, duraklarda serbestçe etkileşebilirsin (sürükle, üzerine gel, tıkla). Sağ üstteki **Menü** ile istediğin bölüme atlayabilirsin.

Bölümlere doğrudan bağlantı verilebilir: `/#hakkimda`, `/#yetenekler`, `/#projeler`, `/#deneyim`, `/#yolculuk`, `/#iletisim`. Ziyaretçi bilgisayarı açınca film o bölüme geçer. Eski sitenin `/hakkimda`, `/projelerim`, `/iletisim` gibi adresleri de bu bağlantılara yönlendirilir.

## Çalıştırma

Gereken: Node.js 20.9 veya üstü.

```bash
npm install
npm run dev        # http://localhost:3015
```

Yayın derlemesi:

```bash
npm run build
npm start          # http://localhost:3015
```

Tip denetimi: `npm run typecheck`

## Ortam değişkenleri

İletişim formu mesajları Gmail üzerinden gönderir. Kök klasörde `.env.local` oluştur (`.env.example` dosyasını kopyalayabilirsin):

```bash
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx   # zorunlu: Gmail "Uygulama şifresi", normal şifre değil
EMAIL_USER=                          # boşsa furkankirci12@gmail.com
EMAIL_TO=                            # boşsa EMAIL_USER'a gider
NEXT_PUBLIC_SITE_URL=                # ör. https://alanadin.com (Vercel'de boş bırakılabilir)
```

Yalnızca `EMAIL_PASSWORD` zorunlu. Eski sitede kullandığın değişken de buydu, yani Vercel'de tanımlıysa olduğu gibi çalışır.

Uygulama şifresi için: Google Hesabı → Güvenlik → 2 Adımlı Doğrulama açık olmalı → Uygulama şifreleri.

`.env*` dosyaları git'e girmez. Yalnızca `.env.example` repoda durur.

## Vercel'e yayınlama

1. Repoyu Vercel'e içe aktar. Framework otomatik olarak Next.js seçilir, ayar değiştirmen gerekmez.
2. **Settings → Environment Variables** altına `EMAIL_PASSWORD` ekle (istersen `EMAIL_USER` ve `EMAIL_TO` da).
3. Deploy et. Alan adı bağladığında `NEXT_PUBLIC_SITE_URL` değerini o adres yap. Paylaşım önizlemeleri (Open Graph) bu adresi kullanır. Boş bırakılırsa Vercel'in verdiği adres kullanılır.

Formda bal küpü alanı, en kısa doldurma süresi ve IP başına basit bir hız sınırı (10 dakikada 4 mesaj) vardır. Hız sınırı bellekte tutulur, yani her sunucusuz örnek kendi sayacını tutar. Kişisel bir site için bu yeterli.

## İçeriği düzenleme

Bütün metinler tek dosyada: **`lib/content.ts`**.

- `profile`: ad, unvan, şehir, e-posta, GitHub, LinkedIn
- `chapters`: bölüm başlıkları, komutları ve tek satırlık cümleleri
- `about`: Hakkımda metni ve `[ OK ]` satırları
- `cores`: yetenek alanları (çekirdekler) ve modülleri
- `procs`: projeler. `featured: true` olanlar vaka çalışması olarak açılır (`/proc/<pid>` paneli). `parent` alanı `ps --forest` ağacını kurar.
- `channels`: deneyim (mantık analizörü kanalları ve dmesg kayıtları). Tarihler ondalık yıl olarak yazılır (2026.17 ≈ Mart 2026).
- `hops`: yolculuk duraklarıyla koordinatlar
- `commands`: sayfadayken klavyeden yazılabilen komutların cevapları

Arama motorları ve ekran okuyucular için aynı içerik `components/SrContent.tsx` içinde düz HTML olarak da üretilir. O da `lib/content.ts` dosyasından beslenir, ayrıca düzenlemen gerekmez.

## Kalite ve performans

Kalite kademesi (Düşük, Orta, Yüksek, Ultra) ekran kartına göre otomatik seçilir. Çalışırken kare hızı düşerse kademe kendiliğinden iner. Ziyaretçi bunu **Kurulum** (BIOS, `DEL` tuşu) ekranından değiştirebilir. Ayarlar tarayıcıda saklanır.

Kare hızı 50'nin altına düşerse önce çizim çözünürlüğü kademeli olarak iner (en fazla %60'a), toparlanınca geri çıkar. Yetmezse kalite bir kademe düşer. Düşük ve Orta kademede kart, alan ışıkları ve vernik katmanı olmadan, çok daha ucuz bir ışıklandırmayla çizilir. Tarayıcı ekran kartını kullanmıyorsa (yazılımla çizim) bekleme ekranında ve BIOS'ta uyarı çıkar.

Test için adrese `?q=low`, `?q=medium`, `?q=high` ya da `?q=ultra` eklenebilir. `?res=1` çözünürlük ölçeğini sabitler. `?debug` eklenirse tarayıcı konsolunda `__mfk` nesnesi açılır, örneğin `__mfk.goto(4.5)` doğrudan deneyim bölümünün ortasına gider. Geliştirme modunda bu nesne her zaman açıktır.

WebGL 2 yoksa site 3B sahnesiz, yalnızca metinle çalışır. İşletim sisteminde "hareketi azalt" açıksa kamera sarsıntısı ve paralaks azaltılır. Ziyaretçi bunu BIOS ekranından da değiştirebilir.

## Klavye

| Tuş                            | İşlev                                  |
| ------------------------------ | -------------------------------------- |
| `Enter` / `Boşluk` (basılı tut) | Bilgisayarı aç                         |
| `Esc`                          | Açılışı atla, paneli kapat             |
| `DEL`                          | BIOS kurulum ekranı                    |
| `F8`                           | Önyükleme menüsü (bölümlere atla)      |
| `Ctrl/Cmd + K`                 | Menü                                   |
| `M`                            | Sesi aç/kapat                          |

<details>
<summary>Sürprizler (spoiler)</summary>

- `Ctrl + Alt + Del` (tarayıcı izin vermezse `Ctrl + Alt + Backspace`): yeniden başlatır.
- Konami kodu (↑ ↑ ↓ ↓ ← → ← → B A): hız aşırtma. Fan bağırır, sonra termal kısma devreye girer.
- Projeler tablosunda bir süreci `kill -9` ile öldürmek: systemd onu yeniden başlatır. Çok hızlı denersen kızar. PID 1 öldürülemez.
- Sayfadayken klavyeden yazılabilenler: `whoami`, `uname`, `uptime`, `ls`, `pwd`, `ping`, `date`, `sudo`, `vim`, `exit`, `help`, `reboot`, `shutdown`.
- `sudo rm -rf /`: kernel panic.
- Tarayıcı konsolunda bir not var.

</details>

## Yapı

```
app/
  layout.tsx           metadata, yazı tipleri
  page.tsx             SrContent + Computer
  actions.ts           iletişim formu (server action, nodemailer)
components/
  Computer.tsx         sahne + katmanlar + kontrolcüler
  canvas/              3B dünya (react-three-fiber)
    Director.tsx       kamera, sis, geçişler: filmin yönetmeni
    board/             prosedürel anakart, dokular, ışıklar
    city/              kalıp planı ve gece şehri
    scheduler/         zamanlayıcı şeritleri
    analyzer/          mantık analizörü
    terrain/           Türkiye yükselti haritası, atlama yayları
    particles/         GPGPU parçacık simülasyonu ve formasyonlar
    Effects.tsx        AO, alan derinliği, bloom, ton eşleme
  overlay/             HTML katmanları: HUD, bölümler, BIOS, menüler
  system/              klavye, fare, ses ve açılış zamanlaması
lib/
  content.ts           bütün metinler
  loop.ts              tek rAF döngüsü + Lenis kaydırma
  audio.ts             Web Audio ile sentezlenen sesler (dosya yok)
  store.ts             uygulama durumu (zustand) + kare değişkenleri
scripts/
  prepare-terrain.py   harita verisini üretir (bir kez çalıştırıldı, çıktılar repoda)
public/data/           terrain.png, contours.bin
```

## Harita verisi

`public/data/terrain.png` ve `public/data/contours.bin`, `scripts/prepare-terrain.py` ile üretildi ve repoda hazır duruyor. Yeniden üretmek istersen betiğin başındaki açıklamada kaynak dosyalar ve gereken Python paketleri yazıyor.

- Yükselti: NASA Visible Earth, *Topography* (kabartma haritası [franky-adl/threejs-earth](https://github.com/franky-adl/threejs-earth) üzerinden alındı)
- Sınırlar ve kıyı çizgisi: [Natural Earth](https://www.naturalearthdata.com/) 1:10m, [world-atlas](https://github.com/topojson/world-atlas) paketiyle

## Teknoloji

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, three.js, @react-three/fiber, drei, postprocessing, Lenis, zustand, nodemailer. Yazı tipleri: Instrument Sans, Instrument Serif, JetBrains Mono (Fontsource).

Bütün sesler tarayıcıda Web Audio ile sentezlenir: 50 Hz şebeke uğultusu, PSU rölesi, fan, 896 Hz POST bip sesi (1.193.182 / 1331) ve ortam katmanları. Ses dosyası yoktur.
