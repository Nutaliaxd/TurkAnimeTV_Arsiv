# -*- coding: utf-8 -*-
"""
AniList verisini (kapak görseli, tür, puan, yıl, özet) BUILD-TIME'da indirir;
özeti Google Translate ile Türkçeye çevirir, kapağı AVIF'e dönüştürür ve
repoya statik dosya olarak yazar. Böylece tarayıcı hiçbir zaman AniList'e
canlı istek atmaz (rate-limit / abuse riski ortadan kalkar).

Çıktılar:
  assets/covers/<slug>.avif   — kapak görseli
  assets/anilist/<slug>.json  — {"averageScore":78,"seasonYear":2013,
                                  "genres":["Aksiyon","Macera"],
                                  "description":"Türkçe özet..."}

Kullanım:
  python scripts/fetch_anilist.py                # eksikleri tamamla (varsayılan)
  python scripts/fetch_anilist.py --force         # hepsini yeniden indir
  python scripts/fetch_anilist.py --limit 50      # test için ilk 50 anime
  python scripts/fetch_anilist.py --only naruto,bleach   # sadece belirli slug'lar

GitHub Actions'ta .github/workflows/anilist-sync.yml tarafından çağrılır.
"""
import argparse, io, json, os, re, sys, time, html as htmlmod
import urllib.request, urllib.error, urllib.parse

try:
    from PIL import Image
    import pillow_avif  # noqa: F401  (Image.open/save'e avif desteği ekler)
except ImportError:
    sys.exit("Eksik bağımlılık: pip install -r scripts/requirements.txt")

KOK = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_JS = os.path.join(KOK, "assets", "data.js")
COVERS_DIR = os.path.join(KOK, "assets", "covers")
ANILIST_DIR = os.path.join(KOK, "assets", "anilist")
AL_URL = "https://graphql.anilist.co"
TR_URL = "https://translate.googleapis.com/translate_a/single"

# AniList'in sabit tür listesi — kendi çevirimiz (Google Translate'e tek tek
# kelime göndermek yerine, tutarlı ve hızlı olsun diye burada sabitlendi).
GTR = {
    "Action": "Aksiyon", "Adventure": "Macera", "Comedy": "Komedi", "Drama": "Drama",
    "Ecchi": "Ecchi", "Fantasy": "Fantastik", "Hentai": "Hentai", "Horror": "Korku",
    "Mahou Shoujo": "Büyülü kız", "Mecha": "Mecha", "Music": "Müzik", "Mystery": "Gizem",
    "Psychological": "Psikolojik", "Romance": "Romantik", "Sci-Fi": "Bilim kurgu",
    "Slice of Life": "Günlük yaşam", "Sports": "Spor", "Supernatural": "Doğaüstü",
    "Thriller": "Gerilim",
}

BATCH = 20           # tek GraphQL isteğinde sorgulanan anime sayısı (alias ile)
REQ_DELAY = 2.2       # istekler arası bekleme (AniList düşürülmüş limitine göre ayarlı)
MAX_RETRY = 4
COVER_MAX_W = 460     # kapak görseli azami genişlik (px) — extraLarge ile aynı mertebe
AVIF_QUALITY = 58


def log(*a):
    print(*a, file=sys.stderr, flush=True)


def anime_listesi():
    ham = open(DATA_JS, encoding="utf-8").read()
    veri = json.loads(ham[ham.index("["): ham.rindex("]") + 1])
    return [(satir[0], satir[1]) for satir in veri]  # (slug, baslik)


def http_json(url, data=None, headers=None, timeout=20):
    req = urllib.request.Request(url, data=data, headers=headers or {}, method="POST" if data else "GET")
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.status, dict(r.headers), r.read()


def al_query(slugs, titles):
    parts = []
    vars_ = {}
    for i, s in enumerate(titles):
        vars_["s%d" % i] = s
        parts.append(
            "m%d: Media(search:$s%d, type:ANIME, isAdult:false){"
            "genres averageScore seasonYear description(asHtml:false) "
            "coverImage{large extraLarge}}" % (i, i)
        )
    query = "query(%s){%s}" % (",".join("$s%d:String" % i for i in range(len(titles))), " ".join(parts))
    body = json.dumps({"query": query, "variables": vars_}).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Mozilla/5.0"}

    for attempt in range(1, MAX_RETRY + 1):
        try:
            status, resp_headers, raw = http_json(AL_URL, data=body, headers=headers)
            return json.loads(raw.decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code == 429:
                wait = int(e.headers.get("Retry-After", "60"))
                log("  [429] rate limit — %ss bekleniyor (deneme %d/%d)" % (wait, attempt, MAX_RETRY))
                time.sleep(wait)
                continue
            log("  [hata] AniList HTTP %s (deneme %d/%d)" % (e.code, attempt, MAX_RETRY))
            time.sleep(REQ_DELAY * attempt)
        except Exception as e:
            log("  [hata] AniList isteği:", e, "(deneme %d/%d)" % (attempt, MAX_RETRY))
            time.sleep(REQ_DELAY * attempt)
    return None


def translate_tr(text):
    """Google Translate'in resmi olmayan ücretsiz uç noktası — API anahtarı gerekmez."""
    text = (text or "").strip()
    if not text:
        return ""
    text = re.sub(r"<br\s*/?>", " ", text, flags=re.I)
    text = re.sub(r"<[^>]+>", " ", text)
    text = htmlmod.unescape(text)
    text = re.sub(r"\(Source:.*?\)\s*$", "", text, flags=re.I | re.S).strip()
    text = re.sub(r"\s+", " ", text)
    if not text:
        return ""
    # Google tek istekte ~5000 karakter kabul eder; özetler zaten çok daha kısa.
    q = urllib.parse.quote(text[:2000])
    url = "%s?client=gtx&sl=en&tl=tr&dt=t&q=%s" % (TR_URL, q)
    for attempt in range(1, MAX_RETRY + 1):
        try:
            status, _, raw = http_json(url)
            data = json.loads(raw.decode("utf-8"))
            return "".join(seg[0] for seg in data[0] if seg and seg[0])
        except Exception as e:
            log("  [hata] çeviri:", e, "(deneme %d/%d)" % (attempt, MAX_RETRY))
            time.sleep(1.5 * attempt)
    return text  # çeviri başarısızsa İngilizce özetle devam et (boş bırakmaktan iyi)


def save_cover_avif(url, dest_path):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = r.read()
    im = Image.open(io.BytesIO(raw)).convert("RGB")
    if im.width > COVER_MAX_W:
        h = int(im.height * COVER_MAX_W / im.width)
        im = im.resize((COVER_MAX_W, h), Image.LANCZOS)
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    im.save(dest_path, "AVIF", quality=AVIF_QUALITY)


def already_done(slug):
    return (os.path.exists(os.path.join(COVERS_DIR, slug + ".avif"))
            and os.path.exists(os.path.join(ANILIST_DIR, slug + ".json")))


def process_group(group):
    """group: [(slug, baslik), ...] — en fazla BATCH eleman."""
    slugs = [g[0] for g in group]
    titles = [g[1] for g in group]
    data = al_query(slugs, titles)
    if not data or not data.get("data"):
        log("  [uyarı] grup için AniList yanıtı yok:", slugs[:3], "...")
        return
    for i, slug in enumerate(slugs):
        m = data["data"].get("m%d" % i)
        if not m:
            continue
        genres_tr = [GTR.get(g, g) for g in (m.get("genres") or [])]
        desc_tr = translate_tr(m.get("description"))
        info = {
            "averageScore": m.get("averageScore"),
            "seasonYear": m.get("seasonYear"),
            "genres": genres_tr,
            "description": desc_tr,
        }
        os.makedirs(ANILIST_DIR, exist_ok=True)
        with open(os.path.join(ANILIST_DIR, slug + ".json"), "w", encoding="utf-8") as f:
            json.dump(info, f, ensure_ascii=False, separators=(",", ":"))
        cover = (m.get("coverImage") or {}).get("extraLarge") or (m.get("coverImage") or {}).get("large")
        if cover:
            try:
                save_cover_avif(cover, os.path.join(COVERS_DIR, slug + ".avif"))
            except Exception as e:
                log("  [uyarı] kapak indirilemedi (%s): %s" % (slug, e))
        log("  ✓", slug)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="mevcut dosyalar olsa da yeniden indir")
    ap.add_argument("--limit", type=int, default=0, help="en fazla N anime işle (0 = sınırsız)")
    ap.add_argument("--only", default="", help="virgülle ayrılmış slug listesi")
    args = ap.parse_args()

    tumu = anime_listesi()
    if args.only:
        istenen = set(s.strip() for s in args.only.split(",") if s.strip())
        tumu = [t for t in tumu if t[0] in istenen]
    if not args.force:
        tumu = [t for t in tumu if not already_done(t[0])]
    if args.limit:
        tumu = tumu[: args.limit]

    log("İşlenecek: %d anime (toplam %d)" % (len(tumu), len(anime_listesi())))
    if not tumu:
        log("Yapılacak bir şey yok — hepsi güncel.")
        return

    for i in range(0, len(tumu), BATCH):
        grp = tumu[i:i + BATCH]
        log("Grup %d/%d (%d anime)" % (i // BATCH + 1, (len(tumu) + BATCH - 1) // BATCH, len(grp)))
        process_group(grp)
        if i + BATCH < len(tumu):
            time.sleep(REQ_DELAY)

    log("Bitti.")


if __name__ == "__main__":
    main()
