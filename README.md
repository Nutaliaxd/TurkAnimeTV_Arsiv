<div align="center">

# TurkAnimeTV Arşiv

**turkanime.tv kapanınca arkasında koca bir arşiv bıraktı. Bu proje o arşivi kurtarmak için başladı: 6.107 anime ve 1.164.716 video linki, tamamen statik ve sunucusuz bir izleme sitesiyle.**

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fnutaliaxd.github.io%2FTurkAnimeTV_Arsiv%2F&label=canl%C4%B1%20site)](https://nutaliaxd.github.io/TurkAnimeTV_Arsiv/)
[![Anime](https://img.shields.io/badge/anime-6.107-blue)](https://nutaliaxd.github.io/TurkAnimeTV_Arsiv/)
[![Video Linki](https://img.shields.io/badge/video%20linki-1.164.716-blue)](https://nutaliaxd.github.io/TurkAnimeTV_Arsiv/)

</div>

<!-- TODO: Ekran görüntüsü eklenecek -->

🔗 **Canlı site:** https://nutaliaxd.github.io/TurkAnimeTV_Arsiv/ — kurulum gerektirmez, tarayıcıda açmanız yeterli.

> ⚠️ **Bu proje hâlâ düzenleniyor ve bitmiş durumda değil.**

---

## Hikâye

2010 yılında kurulmuş olan turkanime.tv, 19 Eylül 2026'da bir gece ansızın kapanma kararı verdi ve kapanmasının ardından arkasında bıraktığı koca arşivi bir şekilde kurtarmaya çalışıyorum.

Sitede bulunan animelerin tüm player (video) linkleri, fansub bilgileri, çevirmen ve redaktör bilgileri bu projede herkese açık bir şekilde paylaşılmaktadır.

Arşiv her gün yenilenmiyor — ama ölü linkleri gizlemek ve yeni link eklemek için küçük bir "canlı tutma" sistemi var (aşağıda).

## Özellikler

- 🔍 **Anlık arama** (`/` kısayolu), sıralanabilir ve filtrelenebilir 6.107 animelik tam liste, kategori sayfaları, rastgele anime butonu
- ▶️ **Bölüme tıkla → doğrudan player**; KAYNAK çipleriyle player'lar arası hızlı geçiş (çalışan kaynak otomatik seçilir)
- 🏷️ Bölüm bazlı fansub + çevirmen bilgisi (kaynak çipleri ve player kartında görünür)
- 🏷️ Kaldırılan linklerin herkes için gizlenmesi (`kaldirilan.js`), eklenen linklerde `+n yeni` rozetleri
- 🖼️ **AniList zenginleştirme**: kapak, banner, özet, puan, yıl ve tür bilgileri (istemci tarafında 14 günlük önbellekle)
- 💾 **Bölüm veya tek link indirme**: yt-dlp komutlarını içeren `.bat` / `.sh` betiği üretir
- 📱 Mobil uyumlu arayüz, koyu tema, `file://` ile çift tıklayarak da tam çalışır
- 🛠️ 1,1 milyon linki host-bazlı hız sınırlarıyla nazikçe kontrol eden, kesintiye dayanıklı **toplu canlılık kontrol motoru**

## Site nasıl çalışıyor?

Sitede sunucu yok; GitHub Pages üzerinde tamamen statik dosyalar döner:

```
Tarayıcı
 └─ search.html          → tek dosyalık SPA (gömülü arama dizini: 6.107 anime)
     ├─ anilist.js       → AniList metadata (kapak, banner, özet, puan…)
     ├─ b/<slug>.js      → her animenin bölümleri + video linkleri (JSONP, 6.107 dosya)
     ├─ kaldirilan.js    → çalışma anında gizlenen linkler   (override)
     └─ eklenen.js       → sonradan eklenen linkler           (override)
```

- Arama dizini (`window.INDEX`) doğrudan `search.html` içine gömülüdür; arama ve liste sayfası hiçbir istek atmadan çalışır.
- Bir anime seçildiğinde yalnızca o animenin `b/<slug>.js` dosyası yüklenir.
- AniList verisi önce `anilist.js`'ten, yoksa doğrudan [AniList GraphQL API](https://docs.anilist.co/)'sinden alınır ve `localStorage`'da önbelleklenir.
- **Override mimarisi** projenin kalbi: ölü linki gizlemek veya yeni link eklemek için 6.107 dosyayı yeniden üretmeye gerek yoktur; küçük iki JS dosyası çalışma anında okunur ve push'landıktan 1-2 dakika sonra değişiklik herkes için yayındadır.

> Not: m3u8/mp4 doğrudan akış gerektiren bazı kaynaklarda video, isteğe bağlı küçük bir yerel çözümleyici yardımcısıyla açılır (bu depoya dahil değildir); diğer tüm player'lar eklenti/sunucu olmadan çalışır.

## Link yönetimi

Linkler arşiv dosyalarında (`b/<slug>.js`) durur. Ölen linkleri gizlemek ve yeni
link eklemek için iki küçük override dosyası kullanılır; `search.html` bunları
çalışma anında okur, `b/` dosyalarını yeniden üretmeye gerek yoktur:

- `kaldirilan.js` → `window.KALDIRILAN = ["url", ...]` — herkes için gizlenen linkler
- `eklenen.js` → `window.EKLENEN = [{url, slug, bolum, player, fansub, eklenme}, ...]` — sonradan eklenen linkler ("yeni" rozetiyle görünür)

### 5 gün sonra bir linkin öldüğünü fark ettim — ne yapmalıyım?

Repo klasöründe:

```bash
python turkanime_yonet.py olu "https://...ölü-link..." --sebep "video silinmiş"
git add kaldirilan.js eklenen.js
git commit -m "link guncelleme"
git push            # veya tek komutla: .\guncelle.ps1
```

GitHub Pages 1-2 dakikada güncellenir; link herkes için kaybolur. Linki yanlışlıkla
kaldırdıysan geri almak için: `python turkanime_yonet.py canli "<url>"`.

### Komutlar

| Komut | Ne yapar |
|---|---|
| `python turkanime_yonet.py olu "<url>" [--sebep "..."]` | Linki gizler (kaldirilan.js) |
| `python turkanime_yonet.py canli "<url>"` | Gizlemeyi geri alır |
| `python turkanime_yonet.py ekle "<url>" --anime <slug> [--bolum <no>] [--player P] [--fansub F]` | Yeni link ekler (eklenen.js). Eksik bilgileri arşiv veritabanından tamamlar; DB yoksa `--anime`, `--player`, `--fansub` zorunludur |
| `python turkanime_yonet.py degistir "<eski-url>" "<yeni-url>"` | Eski linki kaldırıp yeniyi ekler; bölüm/player/fansub bilgisi eski linkten devralınır |
| `python turkanime_yonet.py sil "<url>"` | Yanlış eklenen kaydı eklenen.js'ten çıkarır |
| `python turkanime_yonet.py liste` | Mevcut kaldırılan/eklenen kayıtları özetler |
| `python turkanime_yonet.py uygula [--evet]` | (Opsiyonel) Kayıtları kalıcı olarak `b/<slug>.js` dosyalarına işler; normalde gerekmez |

Eklenen linkler anime sayfasında bölüm satırında `+n yeni` işaretiyle, bölüm
sayfasında yeşil `yeni` rozetiyle gösterilir.

## Toplu link kontrolü

1.164.716 linkin canlılığı düzenli aralıklarla `turkanime_tum_kontrol.py` ile test edilir:

```bash
python turkanime_tum_kontrol.py --test 400     # dengeli örneklemeyle hızlı deneme
python turkanime_tum_kontrol.py                # tam koşu (3 geçiş, resume'lu)
python turkanime_tum_kontrol.py --arbitr 200   # yt-dlp arbiter uzlaşma testi
python turkanime_tum_kontrol.py --limit N      # ilk geçişte yalnızca N link
```

- Host-bazlı naziklik: her video hostunun kendi eşzamanlılık/hız sınırı vardır (ör. Sibnet: 2 eşzamanlı, 0,6 sn aralık).
- Cloudflare duvarı, JS kabuğu ve parked-domain sinyalleri ayırt edilir.
- Sonuçlar CSV'ye ara ara yazılır; Ctrl+C ile keserseniz kaldığınız yerden devam edebilirsiniz.
- Karar sözlüğü: **`calisiyor`** (gerçek player sinyali; HTTP 200 tek başına yetmez) · **`olu`** (kesin ölüm) · **`supheli`** (asla silinmez, yeniden denenir).

## Kurulum

Sitenin kendisi için tek gereksinim bir tarayıcıdır:

```bash
git clone https://github.com/Nutaliaxd/TurkAnimeTV_Arsiv.git
cd TurkAnimeTV_Arsiv
# search.html dosyasını tarayıcıda aç — hepsi bu (internet bağlantısı yeterli)
```

Yönetim ve kontrol araçları için [Python 3.8+](https://www.python.org/downloads/) gerekir:

```bash
pip install curl_cffi yt-dlp
```

- `turkanime_yonet.py` çalıştırılacaksa betiğin başındaki `DB_PATH` değerini kendi arşiv veritabanınızın yoluna ayarlayın (veritabanı olmadan da tüm komutlar, zorunlu argümanları vererek çalışır).
- `guncelle.ps1` bir kopyayı forklamışsanız değişiklikleri push'lamayı kolaylaştırır.

## Proje yapısı

```
TurkAnimeTV_Arsiv/
├── search.html                   # Tek dosyalık SPA: arama → anime → bölüm → player
├── index.html                    # search.html'e yönlendirme
├── anilist.js                    # AniList metadata (kapak, banner, özet, puan…)
├── b/<slug>.js                   # 6.107 dosya: bölümler + video linkleri (JSONP)
├── animeler/                     # Ham arşiv kopyası (sitede kullanılmaz, yalnızca kayıt)
├── kaldirilan.js / eklenen.js    # Çalışma anı override'ları (gizlenen / eklenen linkler)
├── turkanime_yonet.py            # Link yönetim CLI (olu/canli/ekle/degistir/sil/liste/uygula)
├── turkanime_tum_kontrol.py      # 1,1 M linkin toplu canlılık kontrol motoru
├── kaldirilanlari_birlestir.py   # Liste dosyalarını kaldirilan.js'e birleştirir
├── guncelle.ps1 / yukle.ps1      # commit+push ve ilk toplu yükleme betikleri
└── KULLANIM.md                   # Ayrıntılı kullanım notları
```

## Katkıda bulunma

En kolay katkı, arşivi kullanırken ölü bir link gördüğünüzde bildirmektir:

1. `kaldirilan.js` dosyasına ölü linki tek satır olarak ekleyin (GitHub web arayüzünden de düzenlenebilir),
2. Pull request açın — onaylandıktan sonra link herkes için gizlenir; isterseniz [issue açarak](https://github.com/Nutaliaxd/TurkAnimeTV_Arsiv/issues) bize haber verin, biz elle düzeltebiliriz.

<!-- TODO: buraya katkıda bulunanları ekleyeceğiz -->

## Bu projeye destekte bulunanlar

<!-- TODO: Projeye destek verenleri ve bu projeyi kullanıp kendi işinde değerlendirenleri buraya ekleyeceğiz -->

## Yasal uyarı

Bu proje yalnızca **kişisel kullanım ve kültürel arşivleme** amacıyla hazırlanmıştır. Depoda hiçbir video barındırılmaz; yalnızca üçüncü taraf video platformlarındaki, o sırada kamuya açık olan sayfalara giden bağlantılar listelenir. Tüm içerik hakları ilgili hak sahiplerine aittir. Hak sahibi bir talepte bulunmak isterseniz depo üzerinden iletişime geçin; ilgili bağlantılar derhal kaldırılacaktır.

## Lisans

Kod [MIT](LICENSE) lisansı altındadır — tam metin için [LICENSE](LICENSE) dosyasına bakın. Arşiv verisine (anime, bölüm ve link listeleri) ilişkin haklar ilgili hak sahiplerine aittir; bkz. [Yasal uyarı](#yasal-uyarı).
