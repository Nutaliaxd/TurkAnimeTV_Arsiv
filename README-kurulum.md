# TürkAnime Arşiv — çok sayfalı sürüm

Tek sayfalık `search.html` yapısı, her biri kendi adresi/başlığı/açıklaması olan ayrı sayfalara bölündü.

## Sayfalar

| Dosya | Ne işe yarar | Örnek adres |
|---|---|---|
| `index.html` | Ana sayfa: günün önerisi, kategoriler, öneri ve en çok kaynağı olan seriler | `/` |
| `animeler.html` | Tüm seriler, alfabetik + harf filtreli, sayfalı | `/animeler.html?harf=B&s=2` |
| `kategori.html` | Kategori kapağı ve kategori listeleri | `/kategori.html?k=film` |
| `ara.html` | Arama sonuçları (robots: `noindex,follow` — arama sonuçları indekslenmez) | `/ara.html?q=naruto` |
| `anime.html` | Seri sayfası: bölüm listesi, bağlantılı seriler, yorumlar | `/anime.html?seri=naruto` |
| `bolum.html` | Bölüm/izleme sayfası: oynatıcı, önceki-sonraki, bölüm listesi, yorumlar | `/bolum.html?seri=naruto&bolum=12` |
| `search.html` | Eski `#/...` adreslerini yeni sayfalara yönlendiren köprü (silme) | — |

## Ortak dosyalar

- `assets/style.css` — tüm sayfaların stili
- `assets/data.js` — arama indeksi (`window.INDEX`), üretici betiğin yazdığı veri buraya gider
- `assets/core.js` — ortak çekirdek: arama, kartlar, AniList, giscus, SEO yardımcıları
- `assets/page-*.js` — sayfaya özel kod
- `b/<slug>.js`, `kaldirilan.js` — eskisi gibi, aynı klasörde kalır

> Üretici betiğin (`turkanime_b_uret.py`) daha önce `search.html` içine gömdüğü `window.INDEX = ...` satırı artık `assets/data.js` dosyasına yazılmalı. Dosyanın tamamı şu iki satırdan oluşur:
> ```
> "use strict";
> window.INDEX = /*INDEX_START*/[ ... ]/*INDEX_END*/;
> ```

## SEO tarafında ne değişti

- Her sayfanın kendi `<title>`, `meta description`, `canonical`, Open Graph ve Twitter etiketi var; seri/bölüm sayfalarında bunlar açılışta içeriğe göre güncellenir.
- Kırıntı (breadcrumb) hem görsel hem `BreadcrumbList` JSON-LD olarak veriliyor; seri sayfası `TVSeries`, bölüm sayfası `TVEpisode` şeması yazıyor.
- Sayfalama artık `<button>` değil gerçek `<a href>`; bölüm listesi satırları da link. Böylece tarayıcı ve arama botu bütün seri/bölüm sayfalarına gezinebiliyor.
- `robots.txt` hazır; `ara.html`, `b/` ve `api/` kapalı.
- `sitemap.xml` üretildi (ana sayfa + liste + 6.107 seri). Bölüm sayfalarını da eklemek istersen:
  ```
  python sitemap_uret.py https://siteadresin.com --bolumler
  ```
  (yaklaşık 78.000 adres; 45.000'i aşınca otomatik parçalanır ve `sitemap.xml` indeks dosyasına dönüşür)
- Yayına almadan önce `anime.kerim.qzz.io` yazan yerleri gerçek alan adınla değiştir: `robots.txt`, `sitemap.xml` ve sayfaların `<link rel="canonical">` / `og:url` satırları.

## AniList verisi (kapak, tür, puan, özet) — artık build-time

Eskiden her ziyaretçinin tarayıcısı sayfa açıldıkça AniList'in genel GraphQL
API'sine canlı istek atıyordu (kapak görseli + tür/puan/özet için). Bu hem
riskliydi (çok sayıda ziyaretçi = AniList'e sürekli istek, rate-limit'e takılma
ihtimali) hem de özetler İngilizceydi.

Artık bu iş **build-time**'a taşındı:

- `scripts/fetch_anilist.py` — `assets/data.js`'deki her anime için AniList'ten
  kapak/tür/puan/yıl/özet çeker, özeti Google Translate'in ücretsiz uç noktasıyla
  Türkçeye çevirir, kapağı [AVIF](https://caniuse.com/avif)'e dönüştürür ve şu
  dosyaları yazar:
  - `assets/covers/<slug>.avif` — kapak görseli
  - `assets/anilist/<slug>.json` — `{"averageScore":78,"seasonYear":2013,"genres":["Aksiyon","Macera"],"description":"Türkçe özet..."}`
- `.github/workflows/anilist-sync.yml` — bu betiği GitHub Actions üzerinde
  çalıştırıp üretilen dosyaları repoya commit'ler. Üç tetikleyicisi var:
  haftalık zamanlanmış çalışma, `assets/data.js` değiştiğinde otomatik, ve
  Actions sekmesinden elle ("Run workflow" — test için `limit` girilebilir,
  hepsini yeniden indirmek için `force` işaretlenebilir).
- `assets/core.js` artık AniList'e hiç istek atmıyor: `poster()` doğrudan
  `assets/covers/<slug>.avif` dosyasına bakan bir `<img>` üretiyor (dosya yoksa
  `onerror` ile sessizce gizlenip yerini renkli baş harf kutusu alıyor),
  `alDetail()` de `assets/anilist/<slug>.json`'ı okuyor.

Elle çalıştırmak istersen (repo kökünden):
```
pip install -r scripts/requirements.txt
python scripts/fetch_anilist.py            # eksikleri tamamlar
python scripts/fetch_anilist.py --limit 30 # sadece ilk 30 anime (test)
python scripts/fetch_anilist.py --force    # hepsini yeniden indirir
```
İlk çalıştırma 6.107 anime için ~15-25 dakika sürer (AniList'in düşürülmüş
rate-limitine göre ayarlı bir gecikme var); sonraki çalıştırmalar sadece yeni
eklenen animeleri işlediği için birkaç saniyede biter.

`assets/covers/` ve `assets/anilist/` klasörleri repoya commit'lenmeli (statik
dosyalar — sunucu tarafında hiçbir işlem gerektirmiyor, olduğu gibi yayınlanır).

## İsteğe bağlı: temiz adresler

Sunucuda yönlendirme kurabiliyorsan `/anime/<slug>` ve `/bolum/<slug>/<no>` adresleri de çalışır (sayfa kodu bu yolu zaten okuyor).

Apache (`.htaccess`):
```
RewriteEngine On
RewriteRule ^anime/([^/]+)/?$ anime.html [L]
RewriteRule ^bolum/([^/]+)/([^/]+)/?$ bolum.html [L]
```
Netlify (`_redirects`):
```
/anime/:slug           /anime.html   200
/bolum/:slug/:bolum    /bolum.html   200
```
Bu durumda `assets/core.js` içindeki `animeUrl`/`bolumUrl` fonksiyonlarını temiz biçime çevirmen yeterli; gerisi kendiliğinden uyar.
