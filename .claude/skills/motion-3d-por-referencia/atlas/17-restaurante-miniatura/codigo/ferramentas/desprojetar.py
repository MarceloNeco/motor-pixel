# Desprojeta pixels da referência (1280x720) para o mundo, num plano de altura y.
import numpy as np, sys, json
W, H = 1280, 720
CAM = np.array([70.9, 44.6, 85.6]); TGT = np.array([-9.2, 0, -4.1]); FOV = 26.0
f = TGT - CAM; f /= np.linalg.norm(f)
r = np.cross(f, [0, 1, 0]); r /= np.linalg.norm(r); u = np.cross(r, f)
fy = (H / 2) / np.tan(np.radians(FOV) / 2)
def ray(px, py):
    d = f + r * (px - W / 2) / fy + u * (H / 2 - py) / fy
    return d / np.linalg.norm(d)
def ground(px, py, y=0.0):
    d = ray(px, py); t = (y - CAM[1]) / d[1]; return CAM + d * t
def proj(X):
    d = np.array(X) - CAM; zc = d @ f
    return (W / 2 + fy * (d @ r) / zc, H / 2 - fy * (d @ u) / zc)
if __name__ == '__main__':
    pts = json.loads(sys.argv[1])
    for name, (px, py, y) in pts.items():
        g = ground(px, py, y); print(f'{name:18s} px=({px},{py}) y={y} -> x={g[0]:7.2f} z={g[2]:7.2f}')
