# Trilha sintetizada do "Fone explodido". Lê os mesmos instantes da linha do tempo (src/main.js).
#   python3 ferramentas/audio.py out/audio.wav
import sys, wave
import numpy as np

SR, DUR = 48000, 10.0
T = dict(abre=1.5, rotulos=3.25, passo=0.3, fecha=6.7, som=8.5)
n = int(SR * DUR)
t = np.arange(n) / SR
L = np.zeros(n); R = np.zeros(n)
rng = np.random.default_rng(7)

def por(sinal, t0, pan=0.0, ganho=1.0):
    i = int(t0 * SR)
    if i >= n: return
    s = sinal[: n - i] * ganho
    L[i:i + len(s)] += s * np.cos((pan + 1) * np.pi / 4)
    R[i:i + len(s)] += s * np.sin((pan + 1) * np.pi / 4)

def passa_baixa(x, a):
    y = np.zeros_like(x); acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc); y[i] = acc
    return y

def sopro(dur, subindo=True):
    m = int(dur * SR); u = np.arange(m) / m
    ruido = rng.standard_normal(m)
    corte = (0.02 + 0.25 * (u if subindo else 1 - u) ** 2)
    env = np.sin(np.pi * u) ** 1.6
    return passa_baixa(ruido, corte) * env

def nota(freq, dur=0.6, queda=7.0):
    m = int(dur * SR); u = np.arange(m) / SR
    s = np.sin(2 * np.pi * freq * u) + 0.35 * np.sin(2 * np.pi * freq * 2.01 * u) * np.exp(-u * 14) + 0.12 * np.sin(2 * np.pi * freq * 4.2 * u) * np.exp(-u * 30)
    return s * np.exp(-u * queda) * np.minimum(u / 0.004, 1)

def estalo(dur=0.09, freq=1800):
    m = int(dur * SR); u = np.arange(m) / SR
    return (np.sin(2 * np.pi * freq * u) * 0.6 + rng.standard_normal(m) * 0.4) * np.exp(-u * 70)

def baque(freq=62, dur=0.9):
    m = int(dur * SR); u = np.arange(m) / SR
    f = freq * (1 + 1.2 * np.exp(-u * 28))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-u * 5.5) * np.minimum(u / 0.003, 1)

# cama: acorde quente e discreto
cama = np.zeros(n)
for f, g in [(110, 0.5), (164.81, 0.35), (220, 0.3), (277.18, 0.18), (329.63, 0.14)]:
    cama += g * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * (1 + 0.15 * np.sin(2 * np.pi * 0.17 * t + f))
cama *= np.minimum(t / 1.2, 1) * np.minimum((DUR - t) / 1.0, 1) * 0.055
L += cama; R += cama

# abre: sopro + peças saindo, de fora para dentro
por(sopro(1.3, True), T['abre'] - 0.1, 0, 0.5)
for k in range(5):
    t0 = T['abre'] + (4 - k) * 0.11 + 0.12
    por(estalo(0.07, 1300 + k * 220), t0, -0.6, 0.16); por(estalo(0.07, 1250 + k * 220), t0 + 0.03, 0.6, 0.16)
por(baque(80, 0.5), T['abre'] + 0.1, 0, 0.3)

# rótulos: sete notas subindo
escala = [440, 493.88, 554.37, 659.25, 739.99, 880, 1108.73]
pans = [-0.5, -0.4, -0.55, -0.65, 0.45, 0.6, 0.2]
for i, f in enumerate(escala):
    por(nota(f, 0.7, 8), T['rotulos'] + i * T['passo'] + 0.2, pans[i], 0.2)

# fecha: sopro descendo, encaixes e o clique
por(sopro(1.3, False), T['fecha'], 0, 0.45)
for k in range(5):
    t0 = T['fecha'] + k * 0.07 + 0.95
    por(estalo(0.06, 900 + k * 150), t0, -0.5, 0.2); por(estalo(0.06, 950 + k * 150), t0 + 0.02, 0.5, 0.2)
por(estalo(0.12, 520), T['fecha'] + 1.32, 0, 0.5); por(baque(95, 0.35), T['fecha'] + 1.32, 0, 0.35)

# um som: grave + acorde aberto
por(baque(55, 1.4), T['som'], 0, 0.75)
for f, p in [(220, -0.3), (329.63, 0.3), (440, -0.1), (554.37, 0.1)]:
    por(nota(f, 1.5, 2.6), T['som'] + 0.02, p, 0.12)

mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.5) / 1.5
mix *= 0.7 / np.max(np.abs(mix))
fade = np.minimum((DUR - t) / 0.35, 1)[:, None]
pcm = (mix * fade * 32767).astype('<i2')
with wave.open(sys.argv[1] if len(sys.argv) > 1 else 'out/audio.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
rms = 20 * np.log10(np.sqrt(np.mean(mix ** 2)) + 1e-9)
print('audio ok', round(rms, 1), 'dBFS rms')
