# Desprojeta pixels (quadro 1280x720) com a NOSSA câmera para posicionar objetos.
import numpy as np, sys, json
W,H=1280,720
def cam(az=44, pitch=24, dist=94, T=(0.5,6.0,-1.0), fov=22):
    a,p=np.radians(az),np.radians(pitch); T=np.array(T,float)
    C=T+dist*np.array([np.sin(a)*np.cos(p),np.sin(p),np.cos(a)*np.cos(p)])
    f=(T-C)/np.linalg.norm(T-C); r=np.cross(f,[0,1,0]); r/=np.linalg.norm(r); u=np.cross(r,f)
    return C,f,r,u,(H/2)/np.tan(np.radians(fov)/2)
def ground(px,py,y,**k):
    C,f,r,u,fy=cam(**k); d=f+r*(px-W/2)/fy+u*(H/2-py)/fy; t=(y-C[1])/d[1]; return C+d*t
def proj(X,**k):
    C,f,r,u,fy=cam(**k); d=np.array(X)-C; z=d@f; return (W/2+fy*(d@r)/z, H/2-fy*(d@u)/z, z)
if __name__=='__main__':
    k=json.loads(sys.argv[1]) if len(sys.argv)>1 else {}
    for name,(px,py,y) in json.loads(sys.argv[2]).items():
        g=ground(px,py,y,**k); print(f'{name:14s} ({px},{py}) y={y} -> x={g[0]:7.2f} z={g[2]:7.2f}')
    if len(sys.argv)>3:
        for name,X in json.loads(sys.argv[3]).items():
            p=proj(X,**k); print(f'{name:14s} {X} -> ({p[0]:.0f},{p[1]:.0f}) dist {p[2]:.1f}')
