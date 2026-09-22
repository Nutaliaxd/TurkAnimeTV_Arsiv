# One Piece — 0-link inceleme

**Tarih:** 2026-09-22
**Kapsam:** Salt-okunur, yerel statik veri incelemesi. HTTP/oynatma testi yapılmadı.

## Bulgular

### `search.html` indeksindeki One Piece 0-link kaydı

One Piece ad/slug eşleşmeleri içinde indeksin kullanılabilir-link sayacı `0` olan tek kayıt:

| Bölüm | Ad | Slug | Ham indeks kaydı | Kaynak |
|---|---|---|---|---|
| `null` (numarasız özel kayıt) | One Piece: Nenmatsu Tokubetsu Kikaku! Mugiwara no Luffy Oyabun Torimonochou | `one-piece-nenmatsu-tokubetsu-kikaku-mugiwara-no-luffy-oyabun-torimonochou` | `[slug, ad, 1, 1, 0, ["?"]]` | `search.html:162` |

Bu satırın ayrıntı kaynağı `b/one-piece-nenmatsu-tokubetsu-kikaku-mugiwara-no-luffy-oyabun-torimonochou.js:1` içinde şöyledir: `links` dizisinde bir kayıt vardır; ancak `player:"?"`, `fansub:"-"` ve `url:null` olduğu için kullanılabilir bölüm linki yoktur. Yani bu, `links:[]` değil, URL’si boş bir placeholder kaydıdır.

Ana `One Piece` indeks kaydı (`slug: one-piece`) sıfır-link değildir: `search.html:162` satırındaki tuple `1166` bölüm, `18282` `url` tipli link ve `119` `mask` link içerir. Eski Türkanime iç player kayıtları (`AMATERASU(BETA)`, `BANKAI(BETA)`, `HDVID`, `ALUCARD(BETA)`) One Piece ana kaydından çıkarılmıştır.

### `b/one-piece.js` bölüm kontrolü

`b/one-piece.js:1` tek satırda gömülü **1.166** bölüm kaydı parse edildi:

- `links` dizisi boş olan bölüm: **0**
- `links` alanı eksik olan bölüm: **0**
- Hiçbir kullanılabilir URL’si olmayan bölüm: **0**
- Toplam link nesnesi: **18.401**; tamamında boş olmayan `url` alanı var.

Bu nedenle `b/one-piece.js` içinde raporlanacak boş veya linki olmayan bir bölüm yoktur.

## Fansub adı konusunda sınır

Bu bulgu bir fansub adı silme gerekçesi değildir. Sıfır-link kaydındaki `fansub:"-"` zaten adsız bir placeholder’dır; bu kayıt herhangi bir adlandırılmış fansub’un geçersiz, bozuk veya silinmesi gerektiğini kanıtlamaz. Fansub adları değiştirilmedi ve silinmedi.

Kaynak One Piece kaydı ve ilgili `search.html` indeksi, eski iç player kayıtlarının çıkarılmasıyla güncellendi; diğer anime kayıtlarına dokunulmadı.
