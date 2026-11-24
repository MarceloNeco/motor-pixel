#!/usr/bin/env python3
"""Câmera da referência em números: resolve, desprojeta e projeta.

    camera.py resolver pontos.json [--fov 24] [--orto] [--saida camera.json]
    camera.py desprojetar camera.json '{"porta": [640, 515, 0]}'      pixel (x, y) + altura y do plano → ponto do mundo
    camera.py projetar    camera.json '{"topo": [0, 6.5, 0]}'          ponto do mundo → pixel

Por que existe: "câmera alta, lente longa" é adjetivo, e adjetivo de câmera custa uma rodada inteira de retrabalho
(o objeto sai do quadro, a perspectiva não bate, a composição fica "parecida" e nunca igual). Com 5 ou mais pontos
marcados num quadro, a câmera vira azimute, elevação, distância, alvo e campo de visão, que entram direto em
`aplicarCamera()` do projeto.

pontos.json:
    {
      "largura": 1280, "altura": 720,
      "pontos": [
        {"nome": "canto A do piso", "mundo": [-5, 0, 5],  "px": [440, 420]},
        {"nome": "canto B do piso", "mundo": [5, 0, 5],   "px": [640, 515]},
        {"nome": "topo do objeto",  "mundo": [0, 6.5, 0], "px": [655, 180]}
      ]
    }

Como escolher os pontos: você decide a unidade e as medidas do mundo (por exemplo "o piso é um quadrado de lado 10"),
e marca na régua (quadros/regua-NN.jpg) onde cada ponto conhecido aparece. Pontos só no chão deixam o campo de visão
mal preso: inclua pelo menos um ponto com altura (topo de um objeto de altura conhecida ou estimada). Não precisa
acertar a escala real: se tudo for 2× maior, a câmera sai 2× mais longe e o filme é o mesmo.

Câmera de frente e nivelada (vitrine, fachada, tela) também resolve: a elevação pode ser zero ou negativa. Nesse
caso os pontos precisam cobrir PROFUNDIDADE (a frente e o fundo de uma caixa), e a lente depende da profundidade
que você arbitrar: se ela é desconhecida, resolva com duas hipóteses (rasa e funda), veja quanto a lente muda, e
registre a hipótese na perícia.

A saída inclui o erro em pixels por ponto e uma tabela de erro × campo de visão. Se o erro quase não muda entre
15° e 45°, os pontos não prendem a lente: diga isso na perícia e escolha a lente pela deformação que se vê (seção
"Lente" de references/pericia-3d.md).
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import argparse
import json
import sys
from pathlib import Path

try:
    import numpy as np
    from scipy.optimize import least_squares
except ImportError:
    sys.exit("erro: faltam numpy e scipy. Instale com: python3 -m pip install numpy scipy")

R = np.pi / 180


def base(az, el):
    """Vetores da câmera na convenção do projeto: az 0 = câmera em +z olhando a origem; el = graus acima do horizonte."""
    pos = np.array([np.sin(az) * np.cos(el), np.sin(el), np.cos(az) * np.cos(el)])   # direção alvo → câmera
    f = -pos
    r = np.cross(f, [0.0, 1.0, 0.0])
    r /= np.linalg.norm(r)
    u = np.cross(r, f)
    return pos, f, r, u


def projetar(cam, X, W, H):
    X = np.asarray(X, float)
    pos, f, r, u = base(cam["az"] * R, cam["el"] * R)
    alvo = np.array(cam["alvo"], float)
    d = X - (alvo + pos * cam["dist"])
    if cam.get("orto"):
        esc = H / cam["alt"]
        return np.array([W / 2 + esc * (d @ r), H / 2 - esc * (d @ u)]), float(d @ f)
    fy = (H / 2) / np.tan(cam["fov"] * R / 2)
    z = d @ f
    return np.array([W / 2 + fy * (d @ r) / z, H / 2 - fy * (d @ u) / z]), float(z)


def desprojetar(cam, px, py, y, W, H):
    pos, f, r, u = base(cam["az"] * R, cam["el"] * R)
    C = np.array(cam["alvo"], float) + pos * cam["dist"]
    if cam.get("orto"):
        esc = H / cam["alt"]
        o = C + r * (px - W / 2) / esc + u * (H / 2 - py) / esc
        d = f
    else:
        fy = (H / 2) / np.tan(cam["fov"] * R / 2)
        o = C
        d = f + r * (px - W / 2) / fy + u * (H / 2 - py) / fy
    if abs(d[1]) < 1e-9:
        return None
    return o + d * ((y - o[1]) / d[1])


def resolver(dados, fov_fixo=None, orto=False):
    W, H = dados["largura"], dados["altura"]
    pts = dados["pontos"]
    Xs = np.array([p["mundo"] for p in pts], float)
    Us = np.array([p["px"] for p in pts], float)
    centro = Xs.mean(0)
    raio = max(1e-3, float(np.linalg.norm(Xs - centro, axis=1).max()))

    def cam_de(p, fov):
        c = {"az": p[0], "el": p[1], "alvo": [p[3], centro[1], p[4]], "orto": orto}
        if orto:
            c.update(dist=raio * 20, alt=p[2])
        else:
            c.update(dist=p[2], fov=fov)
        return c

    def res(p, fov):
        c = cam_de(p, fov)
        return np.concatenate([projetar(c, X, W, H)[0] - U for X, U in zip(Xs, Us)])

    def melhor(fov):
        best = None
        for az0 in range(-150, 181, 30):
            for el0 in (-20, 0, 8, 20, 35, 55):
                if orto:
                    p0, lo, hi = [az0, el0, raio * 3, centro[0], centro[2]], [-360, -89.5, raio * 0.05, -1e4, -1e4], [360, 89.5, raio * 400, 1e4, 1e4]
                else:
                    d0 = raio / np.tan(fov * R / 2) * 1.2
                    p0, lo, hi = [az0, el0, d0, centro[0], centro[2]], [-360, -89.5, raio * 0.05, -1e4, -1e4], [360, 89.5, raio * 4000, 1e4, 1e4]
                try:
                    r = least_squares(res, p0, bounds=(lo, hi), args=(fov,))
                except Exception:
                    continue
                if best is None or r.cost < best.cost:
                    best = r
        return best

    tabela = []
    if orto:
        b = melhor(None)
        cam = cam_de(b.x, None)
    else:
        candidatos = [fov_fixo] if fov_fixo else [8, 12, 16, 20, 24, 28, 34, 40, 50, 60, 75]
        achados = []
        for fv in candidatos:
            b = melhor(fv)
            rms = float(np.sqrt(np.mean(b.fun ** 2)))
            achados.append((rms, fv, b))
            tabela.append({"fov": fv, "erro_px": round(rms, 2)})
        rms, fv, b = min(achados, key=lambda t: t[0])
        if not fov_fixo and len(pts) >= 4:      # refina o campo de visão em torno do melhor candidato
            def res2(q):
                return res(q[:5], q[5])
            r2 = least_squares(res2, list(b.x) + [fv], bounds=([-360, -89.5, raio * 0.05, -1e4, -1e4, 4], [360, 89.5, raio * 4000, 1e4, 1e4, 100]))
            if r2.cost < b.cost:
                b, fv = r2, float(r2.x[5])
        cam = cam_de(b.x[:5], fv)
    cam["az"] = ((cam["az"] + 180) % 360) - 180
    cam = perto_de(cam, centro)
    erros = [float(np.linalg.norm(projetar(cam, X, W, H)[0] - U)) for X, U in zip(Xs, Us)]
    return cam, erros, tabela


def perto_de(cam, ponto):
    """Leva o alvo, ao longo do eixo de visão, até o ponto do eixo mais próximo de `ponto` (o centro dos pontos
    marcados). A câmera não muda de lugar: só o alvo passa a ficar junto do objeto, que é o que serve para animar
    (órbita, aproximação) e para ler os números."""
    pos, f, r, u = base(cam["az"] * R, cam["el"] * R)
    alvo = np.array(cam["alvo"], float)
    k = float((np.asarray(ponto, float) - alvo) @ f)
    if not cam.get("orto") and cam["dist"] + k <= 1e-6:
        return cam
    c = dict(cam)
    c["alvo"] = [float(v) for v in alvo + f * k]
    c["dist"] = float(cam["dist"] + k)
    return c


def arred(cam):
    c = {"az": round(float(cam["az"]), 2), "el": round(float(cam["el"]), 2), "dist": round(float(cam["dist"]), 3), "alvo": [round(float(v), 3) for v in cam["alvo"]]}
    if cam.get("orto"):
        c.update(orto=True, alt=round(float(cam["alt"]), 3))
    else:
        c["fov"] = round(float(cam["fov"]), 2)
    return c


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    r = sub.add_parser("resolver")
    r.add_argument("pontos")
    r.add_argument("--fov", type=float, help="trava o campo de visão vertical (graus)")
    r.add_argument("--orto", action="store_true", help="câmera ortográfica (sem perspectiva)")
    r.add_argument("--saida", default=None)
    for nome in ("desprojetar", "projetar"):
        s = sub.add_parser(nome)
        s.add_argument("camera")
        s.add_argument("pontos", help="JSON: {nome: [..3 números..]}")
    a = ap.parse_args()

    if a.cmd == "resolver":
        dados = json.loads(Path(a.pontos).read_text())
        n = len(dados["pontos"])
        if n < 3:
            sys.exit("erro: marque pelo menos 3 pontos (5 ou mais para prender a lente).")
        cam, erros, tabela = resolver(dados, a.fov, a.orto)
        c = arred(cam)
        W, H = dados["largura"], dados["altura"]
        rms = float(np.sqrt(np.mean(np.square(erros))))
        print("câmera:", json.dumps(c, ensure_ascii=False))
        print("erro médio: %.1f px (%.2f%% da largura)" % (rms, rms / W * 100))
        for p, e in zip(dados["pontos"], erros):
            print("  %-28s %6.1f px%s" % (p.get("nome", "?"), e, "   <- confira este ponto" if e > max(6.0, 2.5 * rms) else ""))
        avisos = []
        if tabela and len(tabela) > 1:
            print("erro × campo de visão:")
            for t in tabela:
                print("  fov %3d°  %6.2f px" % (t["fov"], t["erro_px"]))
            es = [t["erro_px"] for t in tabela]
            perto = [t["fov"] for t in tabela if t["erro_px"] <= min(es) * 1.5 + 0.5]
            if max(perto) - min(perto) >= 20:
                avisos.append("a lente NÃO está presa pelos pontos: de %d° a %d° o erro é quase igual. Inclua pontos com altura, ou escolha a lente pela deformação visível e trave com --fov." % (min(perto), max(perto)))
        ys = {round(p["mundo"][1], 6) for p in dados["pontos"]}
        if len(ys) == 1 and not a.orto:
            avisos.append("todos os pontos estão na mesma altura: o campo de visão fica mal determinado.")
        if rms > W * 0.012:
            avisos.append("erro alto: as medidas do mundo que você assumiu não batem com a imagem (ou há ponto marcado errado).")
        for av in avisos:
            print("AVISO:", av)
        print("\nno projeto (src/main.js):")
        if c.get("orto"):
            print("  const camera = criarCamera(W, H, { orto: true });")
            print("  { az: %s, el: %s, dist: %s, alvo: %s, alt: %s }" % (c["az"], c["el"], c["dist"], c["alvo"], c["alt"]))
        else:
            print("  { az: %s, el: %s, dist: %s, alvo: %s, fov: %s }" % (c["az"], c["el"], c["dist"], c["alvo"], c["fov"]))
        saida = Path(a.saida) if a.saida else Path(a.pontos).with_name("camera.json")
        saida.write_text(json.dumps({"largura": W, "altura": H, "camera": c, "erro_px": round(rms, 2), "erros": [round(e, 1) for e in erros], "erro_por_fov": tabela, "avisos": avisos}, ensure_ascii=False, indent=1))
        print("gravado:", saida)
        return

    d = json.loads(Path(a.camera).read_text())
    cam, W, H = d["camera"], d["largura"], d["altura"]
    for nome, v in json.loads(a.pontos).items():
        if a.cmd == "desprojetar":
            g = desprojetar(cam, v[0], v[1], v[2] if len(v) > 2 else 0.0, W, H)
            print("%-20s px (%g, %g) na altura y=%g  ->  x=%8.3f  z=%8.3f" % (nome, v[0], v[1], v[2] if len(v) > 2 else 0.0, g[0], g[2]) if g is not None else "%s: raio paralelo ao plano" % nome)
        else:
            p, z = projetar(cam, v, W, H)
            print("%-20s mundo %s  ->  px (%.0f, %.0f)  %s" % (nome, v, p[0], p[1], "dentro" if 0 <= p[0] <= W and 0 <= p[1] <= H else "FORA do quadro"))


if __name__ == "__main__":
    main()
