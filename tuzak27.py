import re,sys
hata=0
for f in ("tema.js","magaza.js","buff.js","kahramanlar.js","heroes.js"):
    yol="/home/user/BDGAMEv2/"+f
    try: s=open(yol,encoding="utf-8").read()
    except: continue
    # st.textContent = ` ... `;  bloklarinin icindeki yorumlarda ters tirnak
    for m in re.finditer(r'textContent\s*=\s*`(.*?)`\s*;', s, re.S):
        for c in re.finditer(r'/\*(.*?)\*/', m.group(1), re.S):
            if "`" in c.group(1):
                satir = s[:m.start(1)+c.start()].count("\n")+1
                print(f"  ✘ {f}:{satir} — sablon dizgisi icindeki yorumda TERS TIRNAK (Tuzak 27)")
                hata+=1
print("Tuzak 27 denetimi:", "TEMIZ ✔" if hata==0 else f"{hata} HATA")
sys.exit(1 if hata else 0)
