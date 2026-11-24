# Monta uma tira de quadros consecutivos (referência em cima, nosso embaixo) para comparar movimento.
#   python3 ferramentas/tira.py INICIO FIM PASSO [x0 y0 x1 y1] saida.jpg
import sys
from PIL import Image, ImageDraw
a, b, st = int(sys.argv[1]), int(sys.argv[2]), int(sys.argv[3])
box = tuple(map(int, sys.argv[4:8])) if len(sys.argv) > 6 else (0, 0, 1280, 720)
out = sys.argv[-1]
fr = list(range(a, b + 1, st))
w = box[2] - box[0]; h = box[3] - box[1]
cols = min(len(fr), 6); rows = (len(fr) + cols - 1) // cols
sc = min(1.0, 420 / w)
tw, th = int(w * sc), int(h * sc)
W = Image.new('RGB', (cols * tw, rows * th * 2 + rows * 6), (0, 0, 0))
for i, f in enumerate(fr):
    for k, (pat, lab) in enumerate((('pericia/todos/r%03d.jpg', 'REF'), ('out/nossos/n%03d.jpg', 'NOSSO'))):
        try: im = Image.open(pat % (f + 1)).crop(box).resize((tw, th), Image.LANCZOS)
        except Exception: continue
        x = (i % cols) * tw; y = (i // cols) * (th * 2 + 6) + k * th
        W.paste(im, (x, y)); ImageDraw.Draw(W).text((x + 4, y + 3), f'{lab} q{f} {f/24:.2f}s', fill=(255, 255, 0))
W.save(out, quality=85)
