#!/usr/bin/env python3
"""Conta-gotas com números: transforma luz, sombra e material em medida.

    sonda.py QUADRO.jpg ponto 640,360 [820,410 ...] [--raio 6]
        cor (hex), luminância e saturação em cada ponto

    sonda.py QUADRO.jpg razao 700,300 760,340 [--raio 8]
        razão de luminância entre dois pontos. Use no herói (lado aceso ÷ lado em sombra = contraste da luz) e no chão
        (chão aceso ÷ chão dentro da sombra = densidade da sombra).

    sonda.py QUADRO.jpg linha 600,520 760,520
        perfil de luminância ao longo de uma linha que ATRAVESSA a borda de uma sombra: devolve a largura da penumbra
        (transição de 10% a 90%) em px e em % da largura do quadro. Penumbra estreita = luz pequena e dura; larga = luz
        grande e macia.

    sonda.py QUADRO.jpg sombra 640,600 500,655 [--altura-px 180]
        pé do objeto e ponta da sombra dele no chão: devolve a direção da sombra na tela (em horas do relógio) e, com a
        altura do objeto em px, a razão sombra ÷ altura (quanto maior, mais baixo o sol).

    sonda.py QUADRO.jpg area 420,180 900,640
        quanto do quadro a caixa ocupa (para o herói e para o elemento do soco) e a cor média dela.

    sonda.py QUADRO.jpg area auto [--limiar 0.08]
        acha sozinho a caixa de tudo o que difere do fundo (o fundo é ajustado como uma superfície suave, então
        acompanha degradê e vinheta). Serve para objeto sobre fundo liso, e compara os dois lados pela mesma régua,
        sem caixa desenhada à mão. Atenção: texto, rótulos e sombra forte também diferem do fundo e entram na caixa;
        use em quadros sem texto, ou passe a caixa à mão quando quiser só o objeto.

As coordenadas são do quadro extraído pela perícia (quadros/regua-NN.jpg mostra a régua). O que estas medidas viram
no three.js está em references/pericia-3d.md.
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import argparse
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _comum import np, Image, abrir, luminancia, hexa


def par(s):
    x, y = s.split(",")
    return float(x), float(y)


def amostra(img, x, y, r):
    h, w, _ = img.shape
    x0, x1, y0, y1 = max(0, int(x - r)), min(w, int(x + r) + 1), max(0, int(y - r)), min(h, int(y + r) + 1)
    return np.median(img[y0:y1, x0:x1].reshape(-1, 3), 0)


def descreve(c):
    mx, mn = float(c.max()), float(c.min())
    return "%s  lum %.3f  sat %.2f" % (hexa(c), float(luminancia(c)), (mx - mn) / mx if mx > 0.02 else 0.0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("quadro")
    ap.add_argument("modo", choices=["ponto", "razao", "linha", "sombra", "area"])
    ap.add_argument("pontos", nargs="+")
    ap.add_argument("--raio", type=float, default=6)
    ap.add_argument("--altura-px", type=float, default=None)
    ap.add_argument("--limiar", type=float, default=0.08, help="para `area auto`: quanto um pixel precisa diferir do fundo (0 a 1)")
    a = ap.parse_args()
    img = abrir(a.quadro)
    H, W, _ = img.shape
    if a.modo == "area" and a.pontos == ["auto"]:
        # fundo = superfície suave (2º grau) ajustada primeiro na moldura e depois em tudo o que já parece fundo:
        # acompanha degradê radial e vinheta, que uma cor única ou uma média por linha não acompanham
        peq = np.asarray(Image.fromarray((img * 255).astype("uint8")).resize((192, max(2, round(192 * H / W))), Image.BILINEAR), dtype=np.float32) / 255
        h, w, _ = peq.shape
        yy, xx = np.mgrid[0:h, 0:w]
        x, y = (xx / (w - 1) - 0.5).ravel(), (yy / (h - 1) - 0.5).ravel()
        A = np.stack([np.ones_like(x), x, y, x * x, y * y, x * y], 1).astype(np.float64)
        k = max(2, int(w * 0.06))
        sel = np.zeros((h, w), bool); sel[:k] = sel[-k:] = True; sel[:, :k] = True; sel[:, -k:] = True
        sel = sel.ravel()
        px = peq.reshape(-1, 3).astype(np.float64)
        for _ in range(4):
            coef = np.linalg.lstsq(A[sel], px[sel], rcond=None)[0]
            res = np.abs(np.einsum('ij,jk->ik', A, coef) - px).max(1)
            sel = res < a.limiar * 0.5
            if sel.sum() < 50:
                break
        fundo_p = np.einsum('ij,jk->ik', A, coef).reshape(h, w, 3)
        fundo = np.asarray(Image.fromarray((np.clip(fundo_p, 0, 1) * 255).astype("uint8")).resize((W, H), Image.BILINEAR), dtype=np.float32) / 255
        dif = np.abs(img - fundo).max(-1)
        m = dif > a.limiar
        if m.sum() < 50:
            sys.exit("não achei nada que difira do fundo com limiar %.2f; baixe o --limiar ou passe a caixa à mão." % a.limiar)
        ys, xs_ = np.where(m)
        x0, x1, y0, y1 = np.percentile(xs_, 0.5), np.percentile(xs_, 99.5), np.percentile(ys, 0.5), np.percentile(ys, 99.5)
        print("caixa automática: %.0f,%.0f %.0f,%.0f" % (x0, y0, x1, y1))
        print("largura %.0f%% do quadro · altura %.0f%% · caixa %.1f%% do quadro · silhueta (pixels que diferem do fundo) %.1f%% do quadro" % (100 * (x1 - x0) / W, 100 * (y1 - y0) / H, 100 * (x1 - x0) * (y1 - y0) / (W * H), 100 * m.mean()))
        print("centro: %.0f%% da largura, %.0f%% da altura" % (100 * (x0 + x1) / 2 / W, 100 * (y0 + y1) / 2 / H))
        return
    P = [par(p) for p in a.pontos]

    if a.modo == "ponto":
        for x, y in P:
            print("(%4.0f, %4.0f)  %s" % (x, y, descreve(amostra(img, x, y, a.raio))))
    elif a.modo == "razao":
        if len(P) != 2:
            sys.exit("razao pede dois pontos: o claro e o escuro")
        c1, c2 = amostra(img, *P[0], a.raio), amostra(img, *P[1], a.raio)
        l1, l2 = float(luminancia(c1)), float(luminancia(c2))
        print("claro  (%4.0f, %4.0f)  %s" % (P[0][0], P[0][1], descreve(c1)))
        print("escuro (%4.0f, %4.0f)  %s" % (P[1][0], P[1][1], descreve(c2)))
        print("razão em exibição: %.2f : 1   ·   o escuro tem %.0f%% da luz do claro" % (l1 / max(l2, 1e-4), 100 * l2 / max(l1, 1e-4)))
        lin = lambda v: v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4
        print("razão em luz linear (a que vale para intensidade de luz no three.js): %.1f : 1" % (lin(l1) / max(lin(l2), 1e-5)))
        print("cor da sombra em relação ao claro (R, G, B): %s   (azul subindo = preenchimento frio; tudo igual = sombra neutra)" % ", ".join("%.2f" % (float(c2[i]) / max(float(c1[i]), 1e-4)) for i in range(3)))
    elif a.modo == "linha":
        if len(P) != 2:
            sys.exit("linha pede dois pontos: um de cada lado da borda da sombra")
        n = int(max(8, math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1])))
        xs, ys = np.linspace(P[0][0], P[1][0], n), np.linspace(P[0][1], P[1][1], n)
        perfil = np.array([float(luminancia(amostra(img, x, y, 2))) for x, y in zip(xs, ys)])
        k = max(1, n // 40)
        if k > 1:       # suaviza repetindo as pontas: completar com zero derrubava o primeiro e o último ponto e a medida saía "0 px"
            perfil = np.convolve(np.pad(perfil, k, mode="edge"), np.ones(k) / k, mode="same")[k:-k]
        a0, a1 = np.median(perfil[:max(2, n // 8)]), np.median(perfil[-max(2, n // 8):])
        if abs(a1 - a0) < 0.02:
            sys.exit("as duas pontas têm quase a mesma luminância (%.3f e %.3f): a linha não atravessa uma borda de sombra." % (a0, a1))
        u = (perfil - a0) / (a1 - a0)
        i10 = int(np.argmax(u > 0.1))
        i90 = int(np.argmax(u > 0.9))
        larg = abs(i90 - i10) * math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) / n
        print("luminância: %.3f → %.3f (razão %.2f : 1)" % (a0, a1, max(a0, a1) / max(min(a0, a1), 1e-4)))
        print("penumbra (10%% a 90%%): %.0f px = %.2f%% da largura do quadro" % (larg, 100 * larg / W))
        print("leitura: %s" % ("dura (luz pequena ou distante: sol, flash)" if larg / W < 0.006 else "média (luz de janela, softbox pequeno)" if larg / W < 0.025 else "macia (luz grande: softbox, céu nublado)"))
        passo = max(1, n // 24)
        for i in range(0, n, passo):
            print("  %4d px  %.3f %s" % (round(i * math.hypot(P[1][0] - P[0][0], P[1][1] - P[0][1]) / n), perfil[i], "#" * int(perfil[i] * 40)))
    elif a.modo == "sombra":
        if len(P) != 2:
            sys.exit("sombra pede dois pontos: o pé do objeto e a ponta da sombra")
        dx, dy = P[1][0] - P[0][0], P[1][1] - P[0][1]
        comp = math.hypot(dx, dy)
        ang = math.degrees(math.atan2(dx, -dy)) % 360          # 0 = para cima, sentido horário
        hora = (ang / 30) or 12
        print("a sombra cai para as %.1f horas na tela (ângulo %.0f°, comprimento %.0f px = %.1f%% da largura)" % (hora if hora >= 1 else 12, ang, comp, 100 * comp / W))
        print("a luz vem do lado oposto: das %.1f horas" % (((ang + 180) % 360) / 30 or 12))
        if a.altura_px:
            r = comp / a.altura_px
            print("sombra ÷ altura do objeto (na tela): %.2f" % r)
            print("  leitura grosseira: abaixo de 0,5 = luz bem do alto · perto de 1 = luz a uns 45° · acima de 2 = luz rasante")
            print("  (na tela a sombra encurta com a perspectiva e com a elevação da câmera; para o ângulo exato, desprojete o pé e a ponta com camera.py)")
    elif a.modo == "area":
        if len(P) != 2:
            sys.exit("area pede dois cantos da caixa")
        x0, x1 = sorted((P[0][0], P[1][0]))
        y0, y1 = sorted((P[0][1], P[1][1]))
        frac = (x1 - x0) * (y1 - y0) / (W * H)
        cor = np.median(img[int(y0):int(y1), int(x0):int(x1)].reshape(-1, 3), 0)
        print("a caixa ocupa %.1f%% do quadro (%.0f%% da largura × %.0f%% da altura) · cor mediana %s" % (100 * frac, 100 * (x1 - x0) / W, 100 * (y1 - y0) / H, descreve(cor)))
        print("centro da caixa: %.0f%% da largura, %.0f%% da altura" % (100 * (x0 + x1) / 2 / W, 100 * (y0 + y1) / 2 / H))


if __name__ == "__main__":
    main()
