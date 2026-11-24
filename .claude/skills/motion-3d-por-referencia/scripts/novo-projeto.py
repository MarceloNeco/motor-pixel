#!/usr/bin/env python3
"""Cria um projeto de motion 3D a partir do modelo da skill.

    novo-projeto.py DESTINO [--formato 16:9|9:16|1:1|4:5 | --tamanho 1920x1080] [--fps 30] [--sem-instalar] [--link PASTA]

Copia assets/template para DESTINO, ajusta nome, formato e quadros por segundo, e roda `npm install` (three,
puppeteer-core e a fonte). DESTINO pode já existir se só tiver `pericia/` e `referencia/` (o normal: a perícia vem antes). --link PASTA aponta node_modules para o de outro projeto já instalado (mais rápido;
os dois precisam das mesmas versões).
Depois: cd DESTINO && node render.mjs cards   (a cena de exemplo tem que renderizar antes de você mexer em qualquer coisa).
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

FORMATOS = {"16:9": (1920, 1080), "9:16": (1080, 1920), "1:1": (1080, 1080), "4:5": (1080, 1350)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("destino")
    ap.add_argument("--formato", choices=list(FORMATOS), default="16:9")
    ap.add_argument("--tamanho", default=None, help="LARGURAxALTURA (os dois pares)")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--nome", default=None, help="nome do filme (vira o nome do vídeo); padrão: o nome da pasta")
    ap.add_argument("--sem-instalar", action="store_true")
    ap.add_argument("--link", default=None)
    a = ap.parse_args()

    modelo = Path(__file__).resolve().parent.parent / "assets" / "template"
    dest = Path(a.destino).expanduser().resolve()
    permitidos = {"pericia", "referencia", "ref", ".DS_Store"}      # a perícia costuma ser feita antes de o projeto existir
    if dest.exists() and any(p.name not in permitidos for p in dest.iterdir()):
        sys.exit("erro: %s já existe e tem outros arquivos além de pericia/ e referencia/. Escolha outra pasta (não sobrescrevo trabalho)." % dest)
    w, h = FORMATOS[a.formato]
    if a.tamanho:
        w, h = (int(v) for v in a.tamanho.lower().split("x"))
    if w % 2 or h % 2:
        sys.exit("erro: largura e altura precisam ser pares (exigência do vídeo H.264).")
    base = dest.parent.name if dest.name.lower() in ("projeto", "codigo", "code", "src", "app") else dest.name      # pasta genérica: o nome é o da pasta de cima
    nome = re.sub(r"[^a-z0-9]+", "-", (a.nome or base).lower()).strip("-") or "motion-3d"
    shutil.copytree(modelo, dest, dirs_exist_ok=True)
    for arq in ("package.json", "motion.json", "cards.json", "planta.json"):
        p = dest / arq
        p.write_text(p.read_text(encoding="utf-8").replace("__NOME__", nome), encoding="utf-8")
    cfg = json.loads((dest / "motion.json").read_text())
    cfg.update(largura=w, altura=h, fps=a.fps)
    (dest / "motion.json").write_text(json.dumps(cfg, indent=2) + "\n")
    (dest / ".gitignore").write_text("node_modules/\nout/\npericia/ref/\npericia/quadros/todos/\naceite/.quadros-*/\n")
    if a.link:
        alvo = Path(a.link).expanduser().resolve()
        if not (alvo / "three").exists():
            sys.exit("erro: %s não parece um node_modules com three." % alvo)
        try:
            (dest / "node_modules").symlink_to(alvo, target_is_directory=True)
        except OSError:
            # Windows sem permissão para criar atalho de pasta: tenta uma junção; se não der, instala normalmente
            feito = os.name == "nt" and subprocess.run(["cmd", "/c", "mklink", "/J", str(dest / "node_modules"), str(alvo)], capture_output=True).returncode == 0
            if not feito:
                print("aviso: não consegui criar o atalho para %s; instalando as dependências no projeto." % alvo)
                a.link = None
        if not (alvo / "@fontsource" / "inter").exists():
            print("aviso: o node_modules apontado não tem @fontsource/inter; a cena de exemplo usa essa fonte.")
    if not a.link and not a.sem_instalar:
        npm = shutil.which("npm")                # no Windows é npm.cmd: precisa do caminho completo
        if not npm:
            sys.exit("erro: npm não encontrado. Instale o Node (https://nodejs.org) e rode `npm install` em %s." % dest)
        r = subprocess.run([npm, "install", "--no-audit", "--no-fund", "--loglevel=error"], cwd=dest)
        if r.returncode != 0:
            sys.exit("erro: `npm install` falhou em %s." % dest)
    for f in ("ffmpeg", "node"):
        if not shutil.which(f):
            print("aviso: '%s' não encontrado; o render precisa dele." % f)
    print("projeto criado: %s · %d×%d · %d qps" % (dest, w, h, a.fps))
    print('próximo: cd "%s" && node render.mjs cards' % dest)


if __name__ == "__main__":
    main()
