# TürkAnime Arşivi — Kullanım Kılavuzu

Bu klasördeki sitenin ve araçların günlük kullanımı. Tarih: 2026-09-20.

---

## 1. Hızlı bakış: hangi dosya ne işe yarar?

| Dosya | Ne işe yarar | Nerede |
|---|---|---|
| `search.html` | Arşiv sitesi (ara → anime → bölüm → player). `index.html` ona yönlendirir. | bu klasör |
| `turkanime_yonet.py` | Link yönetimi: ölü işaretle, ekle, değiştir, geri al | bu klasör |
| `turkanime_tum_kontrol.py` | Bütün linkleri otomatik kontrol eden sistem | bu klasör |
| `kaldirilan.js` / `eklenen.js` | Yönetim kararlarının dosyaya dökülmüş hali (site bunları okur) | bu klasör |
| `kaldirilanlari_birlestir.py` | Birden fazla kaldırma listesini `kaldirilan.js`'te birleştirir | bu klasör |
| `guncelle.ps1` / `yukle.ps1` | GitHub'a commit+push akışın | bu klasör |
| `b\` | Sitenin verisi: anime başına bir `.js` dosyası (6.107 adet) | bu klasör |
| `animeler\` | Mirror'ın ham kopyası — sitede kullanılmıyor (sadece arşiv) | bu klasör |
| `turkanime_b_uret.py` | Veritabanından `b\` dosyalarını yeniden üretir | Downloads |
| `turkanime_ara.py` | Komut satırından anime arayıp linkleri döker | Downloads |
| `turkanime_sunucu.py` | Opsiyonel local sunucu: site + m3u8/mp4 çözümleme API'si | Downloads |
| `turkanime_cek.py` | Tek animeyi AnimeDepo'dan çekip linklerini gösterir | Downloads |
| `turkanime_kontrol.py` | Tek animenin linklerini hızlı test eder | Downloads |
| `turkanime_liste.py` | `anime_listesi.csv` üretir (Excel listesi) | Downloads |
| `turkanime_arsiv_cikar.py` | Mirror → veritabanı kurar (bir kez kuruldu, gerekmez) | Downloads |

**Python:** Her komutta şu python'u kullan:

```powershell
C:\Users\naton\Downloads\.tk-test\Scripts\python.exe
```

Aşağıda kısaca `python` yazılmıştır; hepsi bunun yerine geçer.

**Veritabanı:** `C:\Users\naton\Downloads\turkanime_arsiv\turkanime.db`
(betiklerin üstündeki `DB_PATH` sabiti buraya bakar)

---

## 2. Link kontrol sistemi (`turkanime_tum_kontrol.py`)

Arşivdeki **1.164.716 benzersiz url linkini** host bazlı doğrulayıcılarla gerçekten
çalışıp çalışmadığını anlayarak kontrol eder. Üç geçiş yapar; şüpheliler (403,
sunucu çökmesi, JS kabuğu gibi) sonraki geçişlerde yeniden denenir, **kesin ölü
sinyali olmadan hiçbir link silinmez.**

### Başlatmadan önce: zaten çalışıyor mu bak

```powershell
Get-CimInstance Win32_Process -Filter "Name='python.exe'" | Select-Object ProcessId, CommandLine
type C:\Users\naton\Downloads\turkanime_arsiv\kontrol_progress.json
```

`kontrol_progress.json` güncelleniyorsa koşu sürüyordur — **ikinci kopya başlatma**
(log dosyası kilitli olduğu için `>>` hatası verir ve gereksizdir).

### Başlat (yalnızca çalışmıyorken; kaldığı yerden devam eder)

```powershell
cd C:\Users\naton\Downloads
.\.tk-test\Scripts\python.exe turkanime_tum_kontrol.py >> turkanime_arsiv\kontrol.log 2>&1
```

### İzle

```powershell
type C:\Users\naton\Downloads\turkanime_arsiv\kontrol_progress.json   # canlı sayılar
Get-Content C:\Users\naton\Downloads\turkanime_arsiv\kontrol.log -Tail 20   # son log
```

### Durdur / devam et

```powershell
# Betiğin PID'ini bul:
Get-Process python | Format-Table Id, ProcessName, StartTime
# Durdur:
powershell "Stop-Process -Id <PID>"
```

Sonuçlar her adımda CSV'ye işlenir — korkmadan kesebilirsin, aynı komutla
kaldığı yerden devam eder.

### Çıktılar (hepsi `C:\Users\naton\Downloads\turkanime_arsiv\` içinde)

| Dosya | İçerik |
|---|---|
| `url_durum.csv` | Her URL için karar: `calisiyor` / `olu` / `supheli` + sinyal + http kodu |
| `kontrol_progress.json` | Anlık ilerleme: kontrol edilen, hız, ETA, host bazlı sayılar |
| `kontrol.log` | Detaylı log |

**Karar anlamları:** `calisiyor` = sayfada gerçek player verisi bulundu ·
`olu` = kesin ölüm (404/410 veya "dosya silindi" mesajı) · `supheli` = emin
olunamadı (Cloudflare, sunucu hatası, JS kabuğu) — silinmez, tekrar denenir.

---

## 3. Veritabanından b/ dosyalarını yeniden üret

```powershell
cd C:\Users\naton\Downloads
.\.tk-test\Scripts\python.exe turkanime_b_uret.py
```

`b\` dosyaları veritabanından taze üretilir: durum/rozet verisi artık gömülmez;
bölüm bazlı **fansub + çevirmen bilgisi** (`ta_episode_fansub`) dosyalara eklenir
ve sitede player kartında + seçenekler listesinde görünür. Ardından:

```powershell
cd C:\dev\TurkAnimeTV_Arsiv
.\guncelle.ps1        # commit + push; Pages 1-2 dakikada güncellenir
```

---

## 4. Link yönetimi (`turkanime_yonet.py`)

```powershell
cd C:\dev\TurkAnimeTV_Arsiv

# Link öldüğünde:
python turkanime_yonet.py olu "https://www.mp4upload.com/embed-xxx.html" --sebep "silinmis"

# Yanlış işaretlediysen geri al:
python turkanime_yonet.py canli "https://www.mp4upload.com/embed-xxx.html"

# Yeni link ekle (player/fansub/bölüm verilmezse DB'den bulunur):
python turkanime_yonet.py ekle "https://video.sibnet.ru/shell.php?videoid=123" --anime <slug> --player SIBNET --fansub <ad>

# Eski linki yenisiyle değiştir (metadata otomatik devralınır):
python turkanime_yonet.py degistir "<eski-url>" "<yeni-url>"

# Tüm kayıtları gör:
python turkanime_yonet.py liste

# (Opsiyonel) kararları b\ dosyalarına kalıcı işlemek:
python turkanime_yonet.py uygula --evet
```

### "5 gün sonra link öldü" senaryosu (tam akış)

```powershell
cd C:\dev\TurkAnimeTV_Arsiv
python turkanime_yonet.py olu "<ölü link>"
.\guncelle.ps1          # veya: git add kaldirilan.js eklenen.js ; git commit -m "..." ; git push
```

GitHub Pages **1-2 dakikada** güncellenir — `b\` dosyalarını yeniden üretmene
gerek yok, çünkü site `kaldirilan.js` + `eklenen.js`'i her açılışta okuyup
uygular. GitHub web arayüzünden de yapabilirsin: `kaldirilan.js` dosyasını
aç → kalem ikonu → URL'yi listeye ekle → Commit.

Eklenen linkler sitede yeşil **"yeni"** rozetiyle görünür; kaldırılanlar
listelerden kaybolur.

---

## 5. Siteyi açmak

- **En basit:** `search.html`'e çift tıkla (file:// modu). Arama, anime, bölüm,
  player seçimi ve linkler çalışır. Sadece gömülü player üçüncü parti host
  engeline takılabilir — o zaman "Kaynak" linkini kullan.
- **Bölüm akışı:** bölüme tıklayınca doğrudan player açılır; player altındaki
  **KAYNAK çipleri** ile kaynağa geçiş yapılır (varsayılan kaynak otomatik
  seçilir). Uzun seçenek listesi + yönetim araçları
  player sayfasındaki "Tüm seçenekler (N)" butonundadır
  (`#/anime/<slug>/<bolum>/liste`).
- **Tam deneyim (m3u8/mp4 çözümleme dahil):**

```powershell
cd C:\dev\TurkAnimeTV_Arsiv
python C:\Users\naton\Downloads\turkanime_sunucu.py
# tarayıcı: http://127.0.0.1:8140/search.html
```

- **Çevrimiçi:** `https://nutaliaxd.github.io/TurkAnimeTV_Arsiv/` (push sonrası otomatik)

---

## 6. Diğer araçlar (hızlı referans)

```powershell
cd C:\Users\naton\Downloads
$py = ".\.tk-test\Scripts\python.exe"

& $py turkanime_ara.py "one piece"          # anime ara, linkleri dök (--no N --bolum 5)
& $py turkanime_ara.py tenmaku-no-jaadugar 12
& $py turkanime_kontrol.py tenmaku-no-jaadugar   # tek animenin linklerini test et
& $py turkanime_cek.py <slug> 12            # AnimeDepo'dan tek bölümün linklerini çek
& $py turkanime_liste.py                    # anime_listesi.csv üret (Excel)
```

## 7. Sık kullanılan yollar

```
Repo (sitedeki her şey)     : C:\dev\TurkAnimeTV_Arsiv
Veritabanı                  : C:\Users\naton\Downloads\turkanime_arsiv\turkanime.db
Kontrol sonuçları           : C:\Users\naton\Downloads\turkanime_arsiv\url_durum.csv
Kontrol ilerlemesi          : C:\Users\naton\Downloads\turkanime_arsiv\kontrol_progress.json
Mirror kopyası (ham)        : C:\Users\naton\Downloads\turkanime_arsiv\mirror
Python (venv)               : C:\Users\naton\Downloads\.tk-test\Scripts\python.exe
Yayın adresi                : https://nutaliaxd.github.io/TurkAnimeTV_Arsiv/
```

> **Not:** `animeler\` klasörü (83.489 dosya) sitede kullanılmıyor; git'e
> ekli durumda. Repo boyutu/Pages limiti açısından ileride `git rm -r --cached
> animeler/` ile takipten çıkarmayı düşün — kararı senin.
