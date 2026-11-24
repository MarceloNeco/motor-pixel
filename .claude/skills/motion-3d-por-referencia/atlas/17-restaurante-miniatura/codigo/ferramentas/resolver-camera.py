# Resolve a câmera (posição, guinada, inclinação, fov) a partir de pontos do chão
# marcados na referência. Lote de terra = quadrado de lado 2*s centrado na origem.
import numpy as np
from scipy.optimize import least_squares
W, H = 1280, 720
s = 10.0
# (x, z) no mundo  ->  (u, v) em pixels na referência f000
def pts(w):
    return [((s, s), (640, 515)), ((-s, s), (440, 420)), ((s, -s), (940, 385)),
            ((s + w, s + w), (642, 574)), ((-s - w, s + w), (316, 452)), ((s + w, -s - w), (1008, 357))]

def project(p, X):
    cx, cy, cz, yaw, pitch, fov, w = p
    cam = np.array([cx, cy, cz])
    # frente: guinada em torno de y, inclinação para baixo
    f = np.array([np.sin(yaw) * np.cos(pitch), -np.sin(pitch), np.cos(yaw) * np.cos(pitch)])
    r = np.cross(f, [0, 1, 0]); r /= np.linalg.norm(r)
    u = np.cross(r, f)
    d = X - cam
    zc = d @ f
    fy = (H / 2) / np.tan(np.radians(fov) / 2)
    return np.array([W / 2 + fy * (d @ r) / zc, H / 2 - fy * (d @ u) / zc])

def res(p):
    out = []
    for (x, z), (uu, vv) in pts(p[6]):
        q = project(p, np.array([x, 0, z]))
        out += [q[0] - uu, q[1] - vv]
    return out

best = None
for yaw0 in np.radians([-160, -135, -110]):
    for fov0 in [15, 25, 35]:
        p0 = [40, 40, 40, yaw0, np.radians(40), fov0, 3]
        r = least_squares(res, p0, bounds=([-200, 2, -200, -np.pi, 0.05, 3, 0.5], [200, 200, 200, np.pi, 1.5, 80, 8]))
        if best is None or r.cost < best.cost: best = r
p = best.x
print('custo', best.cost, 'residuos', np.round(best.fun, 1))
print('cam', np.round(p[:3], 2), 'guinada', round(np.degrees(p[3]), 2), 'inclinacao', round(np.degrees(p[4]), 2), 'fov', round(p[5], 2), 'calcada', round(p[6], 2))
cam = p[:3]
f = np.array([np.sin(p[3]) * np.cos(p[4]), -np.sin(p[4]), np.cos(p[3]) * np.cos(p[4])])
t = cam + f * (-cam[1] / f[1])
print('alvo no chao', np.round(t, 2), 'distancia', round(np.linalg.norm(t - cam), 2))
