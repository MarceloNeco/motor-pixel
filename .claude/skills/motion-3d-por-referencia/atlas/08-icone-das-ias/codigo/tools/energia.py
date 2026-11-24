# Energia de movimento quadro a quadro (mesma medida do pericia-movimento.py), impressa em linhas de 0,1 s.
# Uso: python3 tools/energia.py VIDEO.mp4
import subprocess, re, sys, tempfile, pathlib
v = sys.argv[1]
with tempfile.TemporaryDirectory() as tmp:
    alvo = pathlib.Path(tmp) / "m.txt"
    subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-vf", "scale=192:108,tblend=all_mode=difference,signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=%s" % alvo, "-f", "null", "-"], check=True)
    pares = [(float(t), float(e)) for t, e in re.findall(r"pts_time:([\d.]+).*?YAVG=([\d.]+)", alvo.read_text(), re.S)]
passo = 0.1; b = {}
for t, e in pares: b.setdefault(round(t / passo), []).append(e)
linha = []
for k in sorted(b):
    linha.append("%4.1f:%5.2f" % (k * passo, sum(b[k]) / len(b[k])))
    if len(linha) == 10: print("  ".join(linha)); linha = []
if linha: print("  ".join(linha))
