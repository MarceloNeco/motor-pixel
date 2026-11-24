# Pares REF x NOSSO em instantes escolhidos, a partir de quadros avulsos em out/teste.
#   python3 ferramentas/pares.py saida.jpg x0 y0 x1 y1 t1 t2 ...
import sys
from PIL import Image, ImageDraw
out = sys.argv[1]; box = tuple(map(int, sys.argv[2:6])); ts = [float(x) for x in sys.argv[6:]]
w, h = box[2] - box[0], box[3] - box[1]; sc = min(1.0, 420 / w); tw, th = int(w * sc), int(h * sc)
cols = min(6, len(ts)); rows = (len(ts) + cols - 1) // cols
W = Image.new('RGB', (cols * tw, rows * (th * 2 + 6)))
for i, t in enumerate(ts):
    q = round(t * 24)
    r = Image.open('pericia/todos/r%03d.jpg' % (q + 1)).crop(box).resize((tw, th), Image.LANCZOS)
    n = Image.open('out/teste/t%s.jpg' % ('%.2f' % t).zfill(5)).convert('RGB').resize((1280, 720), Image.LANCZOS).crop(box).resize((tw, th), Image.LANCZOS)
    x = (i % cols) * tw; y = (i // cols) * (th * 2 + 6)
    W.paste(r, (x, y)); W.paste(n, (x, y + th))
    d = ImageDraw.Draw(W); d.text((x + 4, y + 3), f'REF q{q} {t:.2f}s', fill=(255, 255, 0)); d.text((x + 4, y + th + 3), 'NOSSO', fill=(255, 255, 0))
W.save(out, quality=86)
