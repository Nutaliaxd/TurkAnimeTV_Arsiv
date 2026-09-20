#!/usr/bin/env python3
"""
Kaldırılan (ölü) linkleri repodaki kaldirilan.js dosyasına birleştirir.

Kullanım (scripti repo kök klasörüne koy):
  python kaldirilanlari_birlestir.py                      # İndirilenler'deki en yeni el_degisiklikleri*.json
  python kaldirilanlari_birlestir.py dosya.json           # {"kaldirilan_url": [...]} ya da düz liste
  python kaldirilanlari_birlestir.py olu_linkler.txt      # satır başına bir URL
  python kaldirilanlari_birlestir.py --geri URL [URL...]  # bir linki listeden çıkar (geri al)

Çıktı her zaman sıralı ve satır başına bir URL olduğu için git diff'i temiz kalır.
"""
import json
import sys
from pathlib import Path

HEDEF = Path(__file__).resolve().parent / "kaldirilan.js"
BASLIK = "/* Otomatik üretilir: kaldirilanlari_birlestir.py — elle düzenleme */\n"


def oku_mevcut():
    if not HEDEF.exists():
        return set()
    t = HEDEF.read_text(encoding="utf-8")
    i = t.index("window.KALDIRILAN")
    a, b = t.index("[", i), t.rindex("]")
    return set(json.loads(t[a:b + 1]))


def yaz(urls):
    govde = ",\n".join(json.dumps(u, ensure_ascii=False) for u in sorted(urls))
    metin = BASLIK + "window.KALDIRILAN = [\n" + govde + "\n];\n"
    with open(HEDEF, "w", encoding="utf-8", newline="\n") as f:
        f.write(metin)


def oku_girdi(yol: Path):
    if yol.suffix.lower() == ".txt":
        satirlar = yol.read_text(encoding="utf-8").splitlines()
        return [s.strip() for s in satirlar if s.strip() and not s.lstrip().startswith("#")]
    veri = json.loads(yol.read_text(encoding="utf-8"))
    if isinstance(veri, dict):
        veri = veri.get("kaldirilan_url") or veri.get("urls") or []
    if not isinstance(veri, list):
        raise SystemExit("Beklenmeyen JSON biçimi: liste ya da {'kaldirilan_url': [...]} olmalı")
    return [u.strip() for u in veri if isinstance(u, str) and u.strip()]


def en_yeni_indirilen():
    dosyalar = sorted((Path.home() / "Downloads").glob("el_degisiklikleri*.json"),
                      key=lambda p: p.stat().st_mtime, reverse=True)
    if not dosyalar:
        raise SystemExit("İndirilenler'de el_degisiklikleri*.json bulunamadı. Yolu argüman olarak ver.")
    return dosyalar[0]


def main(argv):
    mevcut = oku_mevcut()
    if argv and argv[0] == "--geri":
        cikar = set(argv[1:])
        if not cikar:
            raise SystemExit("Kullanım: --geri URL [URL...]")
        yeni = mevcut - cikar
        yaz(yeni)
        print(f"{len(mevcut) - len(yeni)} link listeden çıkarıldı (toplam {len(yeni)})")
        return
    yol = Path(argv[0]) if argv else en_yeni_indirilen()
    gelen = set(oku_girdi(yol))
    yeni = mevcut | gelen
    yaz(yeni)
    print(f"Kaynak: {yol}")
    print(f"{len(yeni) - len(mevcut)} yeni link eklendi, {len(gelen) - (len(yeni) - len(mevcut))} zaten listedeydi (toplam {len(yeni)})")
    print("Sıradaki adım:  .\\guncelle.ps1")


if __name__ == "__main__":
    main(sys.argv[1:])
