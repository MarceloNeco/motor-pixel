#!/usr/bin/env python3
"""Gera o pacote único de instalação: um .zip com a skill, o Atlas dentro dela e o comando /referencia.

    empacotar-skill.py [--saida PASTA]

O .zip traz duas pastas, lado a lado: `motion-3d-por-referencia/` (a skill, com `atlas/`, o modelo de projeto e as
ferramentas) e `referencia/` (o comando /referencia, que abre o Atlas). Quem instala descompacta as duas dentro de
`~/.claude/skills/`: é um passo só, e os dois comandos passam a existir.

Antes de empacotar, atualize o Atlas (`empacotar-atlas.py`) se o acervo mudou.
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import argparse
import re
import sys
import zipfile
from pathlib import Path

FORA = {"__pycache__", ".DS_Store", ".git", "node_modules"}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--saida", default=".")
    ap.add_argument("--repo", default=None, help="em vez do .zip, exporta para a pasta de um repositório git: skills/<as duas pastas>")
    a = ap.parse_args()
    skill = Path(__file__).resolve().parent.parent
    comando = skill.parent / "referencia"
    if not (comando / "SKILL.md").exists():
        sys.exit("erro: não achei a pasta do comando /referencia em %s" % comando)
    if not (skill / "atlas" / "index.html").exists():
        sys.exit("erro: o Atlas ainda não foi montado dentro da skill. Rode empacotar-atlas.py antes.")
    if a.repo:
        import shutil
        repo = Path(a.repo).expanduser().resolve()
        alvo = repo / "skills"
        if alvo.exists():
            shutil.rmtree(alvo)
        n = 0
        for raiz in (skill, comando):
            for arq in sorted(raiz.rglob("*")):
                if arq.is_file() and not (set(arq.parts) & FORA) and not arq.name.startswith("._") and arq.name != "INSTALAR.md":
                    d = alvo / raiz.name / arq.relative_to(raiz)
                    d.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(arq, d)
                    n += 1
        print("repositório: %d arquivos em %s" % (n, alvo))
        return
    versao = re.search(r'version:\s*"([^"]+)"', (skill / "SKILL.md").read_text(encoding="utf-8"))
    nome = "motion-3d-por-referencia-v%s.zip" % (versao.group(1) if versao else "0")
    saida = Path(a.saida).expanduser().resolve()
    saida.mkdir(parents=True, exist_ok=True)
    destino = saida / nome
    n = 0
    with zipfile.ZipFile(destino, "w", zipfile.ZIP_DEFLATED) as z:
        for raiz in (skill, comando):
            for arq in sorted(raiz.rglob("*")):
                if arq.is_file() and not (set(arq.parts) & FORA) and not arq.name.startswith("._"):
                    z.write(arq, Path(raiz.name) / arq.relative_to(raiz))
                    n += 1
        TEXTO = """# Como instalar

1. Descompacte este arquivo dentro da pasta de skills do Claude Code. No Mac ou Linux, no Terminal:

       mkdir -p ~/.claude/skills && unzip -o %s -d ~/.claude/skills

   No Windows, extraia as duas pastas (`motion-3d-por-referencia` e `referencia`) para `%%USERPROFILE%%\\.claude\\skills`.

2. Abra uma conversa nova no Claude Code. Dois comandos passam a existir:

   - `/referencia` abre o Atlas (a galeria dos motions 3D, com o vídeo de cada um). Escolha um estilo, clique em
     "Usar este estilo" e cole no Claude com o seu tema.
   - `/motion-3d-por-referencia` cria um motion 3D a partir de uma referência sua (vídeo, link ou imagem), de um item
     do Atlas, ou do zero.

Precisa ter instalado: Node, Python 3 (com numpy, Pillow e scipy), ffmpeg e o Google Chrome.
""" % nome
        z.writestr("motion-3d-por-referencia/INSTALAR.md", TEXTO)
    (saida / "INSTALAR.md").write_text(TEXTO, encoding="utf-8")      # ao lado do .zip, para ler antes de descompactar
    print("%s · %d arquivos · %.1f MB" % (destino, n, destino.stat().st_size / 1e6))
    print("instalar: mkdir -p ~/.claude/skills && unzip -o %s -d ~/.claude/skills" % nome)


if __name__ == "__main__":
    main()
