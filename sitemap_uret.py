# -*- coding: utf-8 -*-
"""sitemap.xml üretir.
Kullanım:
    python sitemap_uret.py https://siteadresin.com              -> ana sayfa + liste + seri sayfaları
    python sitemap_uret.py https://siteadresin.com --bolumler   -> bölüm sayfaları da eklenir (~78.000 adres)
Girdi: assets/data.js (window.INDEX). 45.000'den fazla adres olursa otomatik parçalanır."""
import json, re, sys, os, datetime, html

ARGS = [a for a in sys.argv[1:] if not a.startswith("--")]
BOLUMLER = "--bolumler" in sys.argv
KOK = (ARGS[0] if ARGS else "https://anime.kerim.qzz.io").rstrip("/") + "/"
BUGUN = datetime.date.today().isoformat()
PARCA = 45000  # tek dosyadaki azami URL

ham = open(os.path.join(os.path.dirname(__file__), "assets", "data.js"), encoding="utf-8").read()
veri = json.loads(ham[ham.index("["): ham.rindex("]") + 1])

urls = [(KOK, "1.0", "daily"), (KOK + "animeler.html", "0.8", "weekly"), (KOK + "kategori.html", "0.6", "monthly")]
for k in ["film", "ova", "tek", "kisa", "sezon", "uzun"]:
    urls.append((KOK + "kategori.html?k=" + k, "0.6", "weekly"))
for h in ["0"] + list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"):
    urls.append((KOK + "animeler.html?harf=" + h, "0.5", "weekly"))

for satir in veri:
    slug, _baslik, bolum = satir[0], satir[1], satir[2]
    urls.append((KOK + "anime.html?seri=" + slug, "0.7", "weekly"))
    if BOLUMLER:
        for i in range(1, int(bolum or 0) + 1):     # bölüm sayfaları
            urls.append(("%sbolum.html?seri=%s&bolum=%d" % (KOK, slug, i), "0.5", "monthly"))

def yaz(dosya, liste):
    with open(dosya, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for u, p, c in liste:
            f.write("<url><loc>%s</loc><lastmod>%s</lastmod><changefreq>%s</changefreq><priority>%s</priority></url>\n"
                    % (html.escape(u), BUGUN, c, p))
        f.write("</urlset>\n")

kok_dizin = os.path.dirname(__file__)
if len(urls) <= PARCA:
    yaz(os.path.join(kok_dizin, "sitemap.xml"), urls)
    print("sitemap.xml — %d adres" % len(urls))
else:
    parcalar = [urls[i:i + PARCA] for i in range(0, len(urls), PARCA)]
    for i, p in enumerate(parcalar, 1):
        yaz(os.path.join(kok_dizin, "sitemap-%d.xml" % i), p)
    with open(os.path.join(kok_dizin, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for i in range(1, len(parcalar) + 1):
            f.write("<sitemap><loc>%ssitemap-%d.xml</loc><lastmod>%s</lastmod></sitemap>\n" % (KOK, i, BUGUN))
        f.write("</sitemapindex>\n")
    print("sitemap.xml + %d parça — toplam %d adres" % (len(parcalar), len(urls)))
