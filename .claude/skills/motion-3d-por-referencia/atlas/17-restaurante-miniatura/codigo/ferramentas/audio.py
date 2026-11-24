# Áudio sintetizado do zero, sincronizado com a linha do tempo do filme.
# Lê os instantes direto de src/timeline.js e a agenda de carros de src/vehicles.js,
# então continua certo se a animação mudar.
#   python3 ferramentas/audio.py out/audio.wav
import re, sys, os
import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, DUR = 48000, 8.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

tl_src = open(os.path.join(ROOT, 'src', 'timeline.js')).read()
TL = {k: float(v) for k, v in re.findall(r'(\w+):\s*([\d.]+)', tl_src.split('export const TL')[1].split('};')[0])}
veh = open(os.path.join(ROOT, 'src', 'vehicles.js')).read()
# passagens na rua A: [instante no meio do quadro, sentido, cor, tipo, velocidade]
passA = re.findall(r"\[([\d.]+), '([EW])', [^,]+, '(\w+)', (\d+)\]", veh.split('const passA')[1].split('];')[0])
# liberações da fila do fundo (cada carro cruza o canto inferior direito ~0,62 s depois)
REL = [float(x) for x in re.findall(r'-?[\d.]+', veh.split('const R = [')[1].split(']')[0])]
KINDS = re.findall(r"'(\w+)'", veh.split('const kinds = [')[1].split(']')[0])
UPB = [float(x) for x in re.findall(r'-?[\d.]+', veh.split('sobe a rua B pelo canto')[1].split('].forEach')[0].split('];')[1])]

L = np.zeros(N); R = np.zeros(N)
def add(sig, t0, pan=0.0, gain=1.0):
    i0 = int(t0 * SR)
    if i0 >= N: return
    if i0 < 0: sig = sig[-i0:]; i0 = 0
    n = min(len(sig), N - i0)
    if np.ndim(pan) == 0:
        gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        L[i0:i0 + n] += sig[:n] * gain * gl; R[i0:i0 + n] += sig[:n] * gain * gr
    else:
        p = pan[:n]; L[i0:i0 + n] += sig[:n] * gain * np.cos((p + 1) * np.pi / 4); R[i0:i0 + n] += sig[:n] * gain * np.sin((p + 1) * np.pi / 4)

def bp(x, lo, hi, order=2): return signal.sosfilt(signal.butter(order, [lo, hi], 'bandpass', fs=SR, output='sos'), x)
def lp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'lowpass', fs=SR, output='sos'), x)
def hp(x, f, order=2): return signal.sosfilt(signal.butter(order, f, 'highpass', fs=SR, output='sos'), x)
def env(n, a, d, shape=3.0):
    t = np.arange(n) / SR; e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / d * shape / 3); return e
def noise(n): return rng.standard_normal(n)

# ---------- cama de cidade: ronco grave + ar + burburinho ----------
def brown(n):
    x = np.cumsum(noise(n)); x = hp(x, 20); return x / np.abs(x).max()
bed_l = lp(brown(N), 300) * 0.5 + bp(noise(N), 300, 3000) * 0.02
bed_r = lp(brown(N), 300) * 0.5 + bp(noise(N), 300, 3000) * 0.02
slow = 1 + 0.15 * np.sin(np.arange(N) / SR * 2 * np.pi * 0.23)
L += bed_l * 0.09 * slow; R += bed_r * 0.09 * slow
# burburinho de gente (cresce depois da inauguração)
t = np.arange(N) / SR
crowd_amt = 0.3 + 0.35 * np.clip((t - TL['crowd0']) / 0.6, 0, 1) + 0.35 * np.clip((t - TL['patioCrowd0']) / 0.8, 0, 1)
for ch in (0, 1):
    m = bp(noise(N), 250, 2200, 3)
    syl = lp(np.abs(noise(N)), 6) ; syl = syl / syl.max()
    c = m * (0.3 + syl) * crowd_amt * 0.018
    if ch == 0: L += c
    else: R += c

# ---------- passagens de carro ----------
def whoosh(dur, f0, f1, body=1.0, rumble=0.0):
    n = int(dur * SR); x = noise(n)
    out = np.zeros(n); seg = 256
    for k in range(0, n, seg):
        u = k / n; fc = f0 + (f1 - f0) * (1 - abs(u - 0.5) * 2)
        b, a2 = signal.butter(2, [max(80, fc * 0.4), min(SR / 2 - 100, fc * 1.6)], 'bandpass', fs=SR)
        out[k:k + seg] = signal.lfilter(b, a2, x[k:k + seg])
    e = np.exp(-((np.arange(n) / n - 0.5) ** 2) / 0.03)
    s = out * e * body
    if rumble:
        tt = np.arange(n) / SR; s += lp(signal.sawtooth(2 * np.pi * (55 + 6 * np.sin(tt * 3)) * tt), 300) * e * rumble
    return s
for tc, d, kind, sp in passA:                      # primeiro plano, cruza o quadro inteiro
    tc = float(tc); bus = kind == 'bus'
    dur = 0.95 if bus else 0.6
    s = whoosh(dur, 500 if bus else 900, 1400 if bus else 2600, 1.0, 0.5 if bus else 0.0)
    pan = np.linspace(-0.85, 0.85, len(s)) if d == 'E' else np.linspace(0.85, -0.85, len(s))
    add(s, tc - dur / 2, pan, 0.5 if bus else 0.34)
for r0, kind in zip(REL, KINDS):                   # fila do fundo: passa pelo canto inferior direito
    if r0 > 8: continue
    bus = kind == 'bus'; dur = 0.8 if bus else 0.5
    s = whoosh(dur, 450 if bus else 800, 1200 if bus else 2200, 1.0, 0.4 if bus else 0.0)
    add(s, r0 + 0.62 - dur / 2, np.linspace(0.2, 0.9, len(s)), 0.32 if bus else 0.2)
for tc in UPB:                                      # quem sobe a rua B pelo canto direito
    s = whoosh(0.42, 800, 2100); add(s, tc + 0.12 - 0.21, np.linspace(0.55, 0.95, len(s)), 0.13)
tt0 = -0.3
while tt0 < DUR:                                    # rumor distante
    s = whoosh(rng.uniform(0.9, 1.6), 300, rng.uniform(700, 1200), 1.0)
    add(s, tt0, rng.uniform(-0.2, 0.8), rng.uniform(0.02, 0.035)); tt0 += rng.uniform(0.3, 0.8)
# ônibus da esquerda: chega e freia (chiado de ar), depois arranca
def hiss(dur): n = int(dur * SR); return hp(noise(n), 3500) * np.exp(-np.arange(n) / SR / (dur / 3))
add(whoosh(0.5, 400, 900, 1.0, 0.5), 0.42, -0.7, 0.22); add(hiss(0.22), 0.69, -0.7, 0.07)
add(whoosh(0.5, 380, 1000, 1.0, 0.6), 1.42, np.linspace(-0.7, -0.95, int(0.5 * SR)), 0.24)
# táxi que sai e carro branco que chega
add(whoosh(0.45, 700, 2000), TL['taxiLeave'] - 0.02, np.linspace(0.5, 0.9, int(0.45 * SR)), 0.2)
add(whoosh(0.4, 600, 1500), TL['whiteCarIn'] - 0.05, -0.6, 0.14)

# ---------- mão: sopro rápido ao entrar e ao sumir ----------
def air(dur, lo=600, hi=5000):
    n = int(dur * SR); x = bp(noise(n), lo, hi); e = np.sin(np.linspace(0, np.pi, n)) ** 2; return x * e
for k_in, k_set, k_out in (('h1In', 'h1Set', 'h1Out'), ('h2In', 'h2Set', 'h2Out')):
    add(air(TL[k_set] - TL[k_in] + 0.1), TL[k_in] - 0.02, 0.0, 0.12)
    add(air(0.16, 500, 3500), TL[k_out] - 0.02, 0.05, 0.09)

# ---------- palito cravando ----------
def thud(f=85, d=0.18, click=0.4, n_lp=900):
    n = int(0.5 * SR); tt = np.arange(n) / SR
    body = np.sin(2 * np.pi * f * tt * (1 - 0.25 * tt / 0.5)) * np.exp(-tt / d)
    return body + lp(noise(n), n_lp) * np.exp(-tt / 0.04) * click
add(thud(80, 0.16, 0.6, 1200), TL['h1Set'] + 0.03, 0.0, 0.45)
add(thud(125, 0.07, 0.5, 2500), TL['plant'] - 0.01, 0.0, 0.3)

# ---------- obra em time-lapse ----------
def knock(f):
    n = int(0.09 * SR); tt = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * tt) * 0.6 + bp(noise(n), f * 0.7, f * 2.2)) * np.exp(-tt / 0.012)
def scrape():
    n = int(0.07 * SR); return bp(noise(n), 700, 3500) * np.linspace(1, 0, n) ** 2
tt0 = TL['dig0']
while tt0 < TL['base0']: add(scrape(), tt0, rng.uniform(-0.3, 0.3), 0.1); tt0 += rng.uniform(0.02, 0.04)
add(thud(95, 0.12, 0.9, 3000), TL['base0'], 0.0, 0.42)          # o anel aparece de uma vez
def glassy(f):
    n = int(0.4 * SR); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * k * tt) / k for k in (1, 2.76, 5.4)) * np.exp(-tt / 0.07)
for k in range(4): add(glassy(rng.uniform(2200, 3400)), TL['base0'] + 0.01 + k * 0.012, rng.uniform(-0.4, 0.4), 0.028)
tt0 = TL['base0'] + 0.02
while tt0 < TL['frameFull'] + 0.03:                                # treliça de madeira em saltos
    add(knock(rng.uniform(450, 1200)), tt0, rng.uniform(-0.5, 0.5), rng.uniform(0.11, 0.22)); tt0 += rng.uniform(0.022, 0.05)
tt0 = TL['frameFull'] + 0.08
while tt0 < TL['h2In']: add(knock(rng.uniform(500, 1500)), tt0, rng.uniform(-0.5, 0.5), rng.uniform(0.04, 0.09)); tt0 += rng.uniform(0.06, 0.16)

# ---------- hambúrguer: surge em rajada (cinco baques macios em menos de 0,1 s) ----------
def squish(f, d, size):
    n = int(0.45 * SR); tt = np.arange(n) / SR
    body = np.sin(2 * np.pi * f * tt * (1 - 0.4 * tt)) * np.exp(-tt / d)
    return (body + bp(noise(n), 300, 2500) * np.exp(-tt / 0.05) * 0.35) * size
B = TL['burger0']
for off, f, size in ((0.045, 72, 0.9), (0.059, 92, 0.7), (0.07, 160, 0.3), (0.08, 200, 0.35), (0.096, 62, 1.35)):
    add(squish(f, 0.12, size), B + off, 0.0, 0.4)

# ---------- luzes, neon e letreiro ----------
def buzz(dur, amp=1.0):
    n = int(dur * SR); tt = np.arange(n) / SR
    h = sum(np.sin(2 * np.pi * 120 * k * tt) / k for k in range(1, 9))
    crackle = (rng.random(n) < 0.002) * noise(n) * 3
    return (h * 0.3 + hp(crackle, 2000)) * amp
def clunk():
    n = int(0.25 * SR); tt = np.arange(n) / SR
    return (bp(noise(n), 1500, 6000) * np.exp(-tt / 0.006) + np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / 0.05) * 0.6)
add(clunk(), TL['lights0'], -0.1, 0.16)
add(clunk(), TL['sign0'], 0.1, 0.22)
add(buzz(0.14) * (rng.random(int(0.14 * SR)) > 0.3), TL['neon0'], 0.25, 0.05)
add(buzz(DUR - TL['neon0'] - 0.14) * 0.25, TL['neon0'] + 0.14, 0.2, 0.025)
add(clunk() * 0.5, TL['open0'], -0.2, 0.1)

# ---------- guarda-sóis abrindo, talheres e copos ----------
def fwump():
    n = int(0.25 * SR); return bp(noise(n), 200, 1800) * np.sin(np.linspace(0, np.pi, n)) ** 3
for k in ('patio0', 'patio1', 'patio2'): add(fwump(), TL[k], 0.6, 0.13)
def clink(f):
    n = int(0.35 * SR); tt = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * k * tt) / k ** 1.5 for k in (1, 2.4, 3.9)) * np.exp(-tt / 0.06)
for base in (3.02, 3.66, 4.9, 5.7, 7.1):
    for k in range(rng.integers(2, 5)):
        add(clink(rng.uniform(2600, 4200)), base + k * rng.uniform(0.03, 0.09), rng.uniform(0.2, 0.7), 0.03)

# ---------- master ----------
mix = np.stack([L, R], 1)
mix = signal.sosfilt(signal.butter(1, 25, 'highpass', fs=SR, output='sos'), mix, axis=0)
# compressão suave
peak = np.abs(mix).max(); mix = mix / peak
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
rms = np.sqrt((mix ** 2).mean()); mix *= 10 ** (-21 / 20) / rms
mix = np.clip(mix, -0.97, 0.97)
fi, fo = int(0.04 * SR), int(0.25 * SR)
mix[:fi] *= np.linspace(0, 1, fi)[:, None]; mix[-fo:] *= np.linspace(1, 0, fo)[:, None]
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'out', 'audio.wav')
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print('audio', out, 'rms dBFS', round(20 * np.log10(np.sqrt((mix ** 2).mean())), 1), 'passagens', len(passA), 'liberacoes', sum(1 for r0 in REL if r0 < 8))
