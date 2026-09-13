# -*- coding: utf-8 -*-
"""Tuzak 27 denetimi — sablon dizgisi icindeki YORUMDA ters tirnak.

ESKI SURUMUN KOR NOKTASI (bu tur iki kez kacirdi):
    textContent\\s*=\\s*`(.*?)`\\s*;  ile sablonun TAMAMI yakalanmaya
    calisiliyordu. Yorumun icindeki ters tirnak sablonu ERKEN bitirdigi
    icin, aranan karakter tam da aramayi bozuyordu; blok kisa kesiliyor
    ve yorum hic goruntulenmiyordu.

YENI YOL: sablonun basindan itibaren karakter karakter ilerlenir.
    CSS yorumunun (/* ... */) icindeysek ters tirnak HATADIR;
    disindaysak ilk ters tirnak sablonu bitirir. Boylece kacis yok.
"""
import sys

DOSYALAR = ("tema.js", "magaza.js", "buff.js", "kahramanlar.js", "heroes.js")
BAS = "textContent"

def tara(s):
    """(satir, sutun) listesi dondurur."""
    bulgu = []
    i = 0
    n = len(s)
    while True:
        i = s.find(BAS, i)
        if i < 0:
            break
        j = i + len(BAS)
        while j < n and s[j] in " \t":
            j += 1
        if j >= n or s[j] != "=":
            i = j
            continue
        j += 1
        while j < n and s[j] in " \t\r\n":
            j += 1
        if j >= n or s[j] != "`":
            i = j
            continue
        # sablon basladi
        k = j + 1
        yorumda = False
        while k < n:
            if yorumda:
                if s[k] == "`":
                    bulgu.append(k)
                    k += 1
                    continue
                if s.startswith("*/", k):
                    yorumda = False
                    k += 2
                    continue
                k += 1
                continue
            if s.startswith("/*", k):
                yorumda = True
                k += 2
                continue
            if s[k] == "\\":
                k += 2
                continue
            if s[k] == "`":
                break          # sablon burada bitti
            k += 1
        i = k + 1
    return bulgu

hata = 0
for f in DOSYALAR:
    try:
        s = open("/home/user/BDGAMEv2/" + f, encoding="utf-8").read()
    except Exception:
        continue
    for yer in tara(s):
        satir = s[:yer].count("\n") + 1
        print("  x %s:%d — sablon dizgisi icindeki YORUMDA ters tirnak (Tuzak 27)" % (f, satir))
        hata += 1

print("Tuzak 27 denetimi:", "TEMIZ" if hata == 0 else "%d HATA" % hata)
sys.exit(1 if hata else 0)
