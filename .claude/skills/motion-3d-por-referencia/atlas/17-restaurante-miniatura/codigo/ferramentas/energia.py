# Energia de movimento por janela de 0,25 s e por região: referência x nosso (quadros em pericia/todos e out/nossos).
import numpy as np
from PIL import Image
def en(pat, box=None, a=1, b=193):
    prev = None; e = []
    for f in range(a, b):
        im = Image.open(pat % f).convert('L')
        if box: im = im.crop(box)
        x = np.asarray(im.resize((320, 180)), float)
        if prev is not None: e.append(np.abs(x - prev).mean())
        prev = x
    return np.array(e)
R = 'pericia/todos/r%03d.jpg'; N = 'out/nossos/n%03d.jpg'
r = en(R); n = en(N)
print('t      ref   nosso')
for i in range(0, 191, 6): print(f'{i/24:4.2f}  {r[i:i+6].mean():5.2f}  {n[i:i+6].mean():5.2f}  ' + '#' * int(r[i:i+6].mean() * 3) + ' | ' + '*' * int(n[i:i+6].mean() * 3))
print('media ref %.2f nosso %.2f | mediana %.2f %.2f | pico/mediana %.2f %.2f' % (r.mean(), n.mean(), np.median(r), np.median(n), r.max() / np.median(r), n.max() / np.median(n)))
for name, box in (('topo', (0, 0, 1280, 240)), ('meio-esq', (0, 240, 640, 480)), ('meio-dir', (640, 240, 1280, 480)), ('base-esq', (0, 480, 640, 720)), ('base-dir', (640, 480, 1280, 720))):
    print('%-9s parado(3,5-8s): ref %.2f nosso %.2f | abertura(0-0,8s): ref %.2f nosso %.2f' % (name, en(R, box, 85).mean(), en(N, box, 85).mean(), en(R, box, 1, 20).mean(), en(N, box, 1, 20).mean()))
