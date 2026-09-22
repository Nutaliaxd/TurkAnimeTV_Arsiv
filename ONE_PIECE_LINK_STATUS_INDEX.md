# One Piece link audit index

Kaynak: `b/one-piece.js`; SHA-256: `7e1f7449dedf6ba3ae1f3c0bc127c67f586ece761d4e5ed0a23434af86327313`. Kaynak dosyalar değiştirilmedi.

Bölüm kaydı: **1166**; toplam link satırı: **18401**; doğrudan URL: **18282**; mask/yol: **119**.
Doğrudan URL’lerin tamamında kalıcı sınıf var mı: **Evet**.

Kullanıcı doğrulama override’ları: **3559** Sibnet linki çalışan/One Piece eşleşmesi; **29** MEGA ve **9** VK linki ölü; **1122** MP4Upload linki sorunlu/blocked; **119** mask/yol kaydı erişilemez/kesin kırık; yeniden testte **233** Mail.ru linkinden **8** working ve **225** kırık. Bu sayılar kaynak veriyi değiştirmez; ayrılmış listelerin sınıflandırmasını değiştirir.

Eski Türkanime iç player kayıtları (`AMATERASU(BETA)`, `BANKAI(BETA)`, `HDVID`, `ALUCARD(BETA)`) güncel `b/one-piece.js` kaydından çıkarıldı ve aşağıdaki güncel listelere dahil edilmedi. Shard test dosyaları silme öncesi tarihsel snapshot olarak bu kayıtları içerebilir.

## Ağ sınıfları (doğrudan URL kayıtları)

| Sınıf | Sayı |
|---|---:|
| WORKING_HTTP | 5366 |
| BLOCKED_OR_TRANSIENT | 9138 |
| DEFINITELY_BROKEN | 3778 |

## Mask/yol sınıfı

| Sınıf | Sayı |
|---|---:|
| DEFINITELY_BROKEN — kullanıcı erişemedi | 119 |
| UNRESOLVED_MASK_OR_PATH | 0 |

## İçerik sınıfları

| Sınıf | Sayı |
|---|---:|
| CONTENT_MATCH_CONFIRMED | 3769 |
| CONTENT_UNRESOLVED | 13786 |
| NO_PLAYER_CONTENT | 725 |
| WRONG_CONTENT_OR_MISMATCH | 2 |

## Ayrılmış dosyalar

- [HTTP erişilebilir linkler](ONE_PIECE_WORKING_HTTP_LINKS.md)
- [İçerik/bölüm eşleşmesi görülenler](ONE_PIECE_CONTENT_MATCH_LINKS.md)
- [Pass ama yanlış içerik/player yok](ONE_PIECE_WRONG_CONTENT_OR_NO_PLAYER.md)
- [Kesin kırık linkler](ONE_PIECE_DEFINITELY_BROKEN_LINKS.md)
- [Engelli/geçici linkler](ONE_PIECE_BLOCKED_OR_TRANSIENT_LINKS.md)
- [Gerçek oynatma smoke kanıtı](ONE_PIECE_PLAYER_SMOKE_VERIFIED.md)
- [Fansub silme karar desteği](ONE_PIECE_FANSUB_DELETION_CANDIDATES.md)

Notlar: WORKING_HTTP yalnızca ağ erişimidir; metadata eşleşmesi ve sınırlı smoke gözlemi ayrı tutulur. DEFINITELY_BROKEN test anındaki güçlü kullanılamazlık sinyalidir, kalıcı silinme garantisi değildir. 0-link özel kayıt ayrıca [ONE_PIECE_ZERO_LINK_REPORT.md](ONE_PIECE_ZERO_LINK_REPORT.md) içinde belgelenmiştir; ana One Piece kaydında named fansub silme temeli değildir.
