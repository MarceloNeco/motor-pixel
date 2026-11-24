#!/usr/bin/env python3
"""Folha de quadros para revisão: de um vídeo ou de uma pasta de quadros.

    folha.py VIDEO.mp4 --saida out/folha.jpg [--cada 0.25] [--de 0 --ate 4] [--colunas 8] [--largura 320]
    folha.py out/folha/ --saida out/folha.jpg           (pasta gerada por `node render.mjs folha`)

Revisar um motion é olhar quadros parados, quatro por segundo: é assim que aparecem peça atravessando outra, texto
cortado, objeto fora do quadro, corte no lugar errado. Olhe a folha inteira antes de mostrar qualquer coisa.
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import argparse
import re
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _comum import np, extrair, folha, sonda


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("origem")
    ap.add_argument("--saida", required=True)
    ap.add_argument("--cada", type=float, default=0.25)
    ap.add_argument("--de", type=float, default=0.0)
    ap.add_argument("--ate", type=float, default=None)
    ap.add_argument("--colunas", type=int, default=8)
    ap.add_argument("--largura", type=int, default=320)
    a = ap.parse_args()
    src = Path(a.origem)
    if src.is_dir():
        arqs = sorted(p for p in src.iterdir() if p.suffix.lower() in (".jpg", ".png"))
        itens = []
        for p in arqs:
            m = re.search(r"(\d+\.\d+)", p.stem)
            itens.append((p, (m.group(1).lstrip("0") or "0") + "s" if m else p.stem))
    else:
        info = sonda(src)
        tmp = Path(tempfile.mkdtemp(prefix="folha-"))
        quadros, fps = extrair(src, tmp, max(a.largura * 2, 640))
        fim = a.ate if a.ate is not None else info["duracao"]
        itens = [(quadros[min(len(quadros) - 1, int(round(t * fps)))], "%.2fs" % t) for t in np.arange(a.de, fim - 1e-6, a.cada)]
    paginas = [itens[i:i + a.colunas * 8] for i in range(0, len(itens), a.colunas * 8)]
    for k, pag in enumerate(paginas):
        saida = Path(a.saida)
        if len(paginas) > 1:
            saida = saida.with_name("%s-%02d%s" % (saida.stem, k + 1, saida.suffix))
        folha(pag, saida, colunas=a.colunas, largura_celula=a.largura)
        print("folha:", saida, "·", len(pag), "quadros")


if __name__ == "__main__":
    main()
