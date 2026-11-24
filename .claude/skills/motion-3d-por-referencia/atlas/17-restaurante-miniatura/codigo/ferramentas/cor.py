# Compara estatísticas de cor/luminância: referência x nossos quadros avulsos (out/teste).
import sys, numpy as np
from PIL import Image
def st(ims):
    a = np.stack([np.asarray(im.convert('RGB').resize((320, 180)), float) / 255 for im in ims]); lum = (a * [0.2126, 0.7152, 0.0722]).sum(-1)
    mx = a.max(-1); mn = a.min(-1); sat = np.where(mx > 0.05, (mx - mn) / np.maximum(mx, 1e-3), 0)
    m = a.reshape(-1, 3).mean(0)
    return f'media {m.round(3)} razao 1:{m[1]/m[0]:.2f}:{m[2]/m[0]:.2f} lum p1,5,25,50,75,95,99 {np.percentile(lum,[1,5,25,50,75,95,99]).round(3)} sat {sat.mean():.3f}'
ts = [float(x) for x in sys.argv[1:]]
print('REF  ', st([Image.open('pericia/todos/r%03d.jpg' % (round(t * 24) + 1)) for t in ts]))
print('NOSSO', st([Image.open('out/teste/t%s.jpg' % ('%.2f' % t).zfill(5)) for t in ts]))
