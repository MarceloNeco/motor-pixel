#!/usr/bin/env python3
"""O atlas de motions aprovados como ponto de partida.

    atlas.py abrir [--sem-abrir]    abre a página do atlas no navegador e lista os motions (é o que /referencia faz)
    atlas.py listar                 os motions disponíveis (número, nome, estilo, tipo, duração)
    atlas.py 18                     ficha do motion 18 e os arquivos para ler e para copiar
    atlas.py "vista explodida"      busca por nome ou estilo

Partir de um motion do atlas é o caminho mais rápido: a análise da referência já foi feita (METODO.md e
pericia-da-referencia.md), as peças e a cena existem (codigo/), e o trabalho é trocar o conteúdo pelo tema novo.

O atlas vem dentro da skill, na pasta `atlas/`. A variável MOTION_ATLAS aponta para outro atlas, se você tiver um.
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import json
import os
import sys
import unicodedata
from pathlib import Path

RAIZES = [os.environ.get("MOTION_ATLAS"), str(Path(__file__).resolve().parent.parent / "atlas")]


def raiz():
    for r in RAIZES:
        if r and Path(r).is_dir() and any(Path(r).glob("*/ficha.json")):
            return Path(r)
    sys.exit("O atlas não está nesta máquina. Ponha a pasta do atlas em %s (ou defina MOTION_ATLAS com o caminho dela).\n"
             "Sem o atlas a skill funciona igual: mande a sua referência (vídeo, link ou imagem) ou descreva o que quer criar." % RAIZES[1])


def lista(todos):
    for d in todos:
        print("%02d  %-28s %-38s %-18s %s s" % (int(d.get("numero", 0)), d.get("nome", "")[:28], d.get("estilo", "")[:38], d.get("tipo", "")[:18], d.get("duracao_s", "")))


def abrir(r, todos, de_verdade=True):
    import shutil
    import subprocess
    pagina = r / "index.html"
    if not pagina.exists():
        print("O atlas está em %s, mas a página index.html não foi gerada (rode montar-galeria.py lá)." % r)
    elif de_verdade:
        try:
            # por HTTP local, não file://: o navegador só recebia o index.html e não lia os vídeos ao lado (tela preta, 0:00)
            subprocess.run([sys.executable, str(Path(__file__).resolve().parent / "servir_atlas.py"), str(r)], check=True)
            print("atlas aberto no navegador\n")
        except Exception as e:
            print("não consegui abrir o navegador (%s). Abra à mão: %s\n" % (e, pagina))
    else:
        print("página do atlas: %s\n" % pagina)
    lista(todos)


def chave(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s).lower()) if unicodedata.category(c) != "Mn")


def itens(r):
    out = []
    for f in sorted(r.glob("*/ficha.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            continue
        d["_pasta"] = f.parent
        out.append(d)
    return out


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    r = raiz()
    todos = itens(r)
    q = " ".join(sys.argv[1:])
    if q.startswith("abrir"):
        abrir(r, todos, "--sem-abrir" not in sys.argv)
        return
    if q == "listar":
        print("atlas em %s\n" % r)
        lista(todos)
        return
    achados = [d for d in todos if (q.isdigit() and int(d.get("numero", -1)) == int(q)) or (not q.isdigit() and chave(q) in chave(d.get("nome", "") + " " + d.get("estilo", "") + " " + d["_pasta"].name))]
    if not achados:
        sys.exit("nada no atlas para '%s'. Rode `atlas.py listar`." % q)
    for d in achados[:3]:
        p = d["_pasta"]
        print("# %02d · %s (%s)" % (int(d.get("numero", 0)), d.get("nome", ""), d.get("estilo", "")))
        print("pasta: %s" % p)
        print("formato: %s · %s s · %s" % (d.get("formato", "?"), d.get("duracao_s", "?"), d.get("motor", "")))
        if d.get("descricao"):
            print("o que é: %s" % d["descricao"])
        if d.get("bom_para"):
            print("bom para: %s" % d["bom_para"])
        print("ler, nesta ordem: %s" % " · ".join(str(p / n) for n in ("METODO.md", "pericia-da-referencia.md") if (p / n).exists()))
        cod = p / "codigo"
        if cod.exists():
            arqs = sorted(str(a.relative_to(cod)) for a in cod.rglob("*") if a.is_file() and "node_modules" not in a.parts and a.suffix in (".js", ".mjs", ".json", ".html", ".py"))
            print("código: %s (%d arquivos: %s%s)" % (cod, len(arqs), ", ".join(arqs[:8]), " ..." if len(arqs) > 8 else ""))
        print("vídeo: %s\n" % next((str(v) for v in p.glob("*.mp4")), "não está na pasta"))
    print("Como partir dele: crie o projeto com novo-projeto.py (o modelo traz o motor corrigido) e PORTE do código do atlas\n"
          "as peças, os materiais, a câmera e a linha do tempo. Não copie o render.mjs nem o pipeline antigo.")


if __name__ == "__main__":
    main()
