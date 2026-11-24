#!/usr/bin/env python3
"""Monta a página de aprovação dos cards: um arquivo HTML só, com as imagens embutidas.

    montar-cards.py [PASTA_DO_PROJETO]        lê cards.json e cards/<id>.jpg → grava cards.html

O arquivo único existe porque a página viaja (painel do app, mensagem, outro computador) e imagem solta se perde no
caminho: já aconteceu de a pessoa abrir a página e ver só o texto.

cards.json (o modelo vem no projeto): titulo, resumo, mecanismo, decisoes[], metodo_x_mundo[{papel, referencia, nosso}],
momentos[{id, nome, janela, move, emenda, ref}], sistema[{token, medido, nosso}], proibicoes[], risco{qual, plano_b},
metas[{medida, referencia, meta}], copy[]. Em cada momento, `ref` (opcional) é o caminho de um quadro da referência
para aparecer ao lado do nosso card: é o jeito mais rápido de a pessoa julgar "está próximo?".

A página recusa sair com campos "TROCAR" sobrando ou com card sem imagem: página de aprovação pela metade faz a
pessoa aprovar o que não viu.
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import base64
import html
import json
import re
import sys
from pathlib import Path

CSS = """
:root { --papel:#f6f5f4; --tinta:#111; --azul:#0075de; --mar:#f5b82e; --coral:#ef6a5b; --linha:#e3e1de; --cinza:#6b6966; }
* { box-sizing:border-box; }
body { margin:0; background:var(--papel); color:var(--tinta); font:15px/1.5 Inter, -apple-system, "Helvetica Neue", Arial, sans-serif; }
main { max-width:1280px; margin:0 auto; padding:40px 28px 80px; }
h1 { font-size:34px; line-height:1.1; letter-spacing:-.02em; font-weight:800; margin:0 0 10px; }
h1 mark { background:var(--mar); padding:0 .15em; }
h2 { font-size:22px; font-weight:800; letter-spacing:-.01em; margin:44px 0 12px; }
.sub { color:var(--cinza); max-width:860px; margin:0 0 6px; }
.mec { background:#fff; border:1px solid var(--linha); border-left:4px solid var(--azul); border-radius:10px; padding:14px 18px; margin:22px 0 8px; font-size:17px; }
.mec b { display:block; font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--azul); margin-bottom:4px; }
.dec { background:#fff; border:1px solid var(--linha); border-left:4px solid var(--mar); border-radius:10px; padding:12px 18px; }
.dec ol { margin:6px 0 0; padding-left:20px; }
.grade { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.card.largo { grid-column:1 / -1; }
.card { background:#fff; border:1px solid var(--linha); border-radius:14px; overflow:hidden; }
.card img { display:block; width:100%; height:auto; }
.par { display:grid; grid-template-columns:1fr 1fr; gap:2px; background:var(--linha); }
.par figure { margin:0; position:relative; background:#000; }
.par figcaption { position:absolute; left:8px; top:8px; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:#fff; background:rgba(0,0,0,.6); padding:2px 8px; border-radius:999px; }
.card div.t { padding:12px 16px 16px; }
.rot { display:flex; align-items:baseline; gap:10px; }
.rot b { font-size:17px; font-weight:800; }
.rot .n { color:var(--azul); font-variant-numeric:tabular-nums; }
.rot span.j { margin-left:auto; font-size:12px; color:var(--cinza); border:1px solid var(--linha); border-radius:999px; padding:1px 9px; white-space:nowrap; }
.card p { margin:6px 0 0; font-size:14px; }
.card p.em { color:var(--cinza); }
table { width:100%; border-collapse:collapse; background:#fff; border:1px solid var(--linha); border-radius:10px; overflow:hidden; font-size:14px; }
th, td { text-align:left; padding:9px 12px; border-bottom:1px solid var(--linha); vertical-align:top; }
th { font-size:11px; text-transform:uppercase; letter-spacing:.06em; color:var(--cinza); background:#fbfaf9; }
tr:last-child td { border-bottom:0; }
.duas { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
.box { background:#fff; border:1px solid var(--linha); border-radius:10px; padding:14px 18px; }
.box h3 { margin:0 0 8px; font-size:15px; }
.box ul { margin:0; padding-left:18px; font-size:14px; }
.box li { margin:4px 0; }
.risco { border-left:4px solid var(--coral); }
.sw { display:inline-block; width:12px; height:12px; border-radius:3px; margin-right:6px; vertical-align:-1px; border:1px solid rgba(0,0,0,.15); }
pre { background:#fff; border:1px solid var(--linha); border-radius:10px; padding:14px 18px; font:14px/1.6 ui-monospace, Menlo, monospace; white-space:pre-wrap; margin:0; }
@media (max-width:760px) { .grade, .duas { grid-template-columns:1fr; } }
"""


def e(s):
    s = html.escape(str(s))
    return re.sub(r"(#[0-9a-fA-F]{6})\b", r'<span class="sw" style="background:\1"></span>\1', s)


def embutir(caminho):
    dados = base64.b64encode(caminho.read_bytes()).decode()
    return "data:image/%s;base64,%s" % ("png" if caminho.suffix.lower() == ".png" else "jpeg", dados)


def main():
    raiz = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    arq = raiz / "cards.json"
    if not arq.exists():
        sys.exit("erro: não achei %s" % arq)
    bruto = arq.read_text(encoding="utf-8")
    d = json.loads(bruto)
    faltas = []
    if "TROCAR" in bruto:
        faltas.append("há %d campo(s) com 'TROCAR' em cards.json" % bruto.count("TROCAR"))
    cards = []
    for m in d.get("momentos", []):
        img = next((raiz / "cards" / (m["id"] + ext) for ext in (".jpg", ".png") if (raiz / "cards" / (m["id"] + ext)).exists()), None)
        if img is None:
            faltas.append("card sem imagem: cards/%s.jpg (rode `node render.mjs cards`)" % m["id"])
            continue
        ref = None
        if m.get("ref"):
            ref = raiz / m["ref"]
            if not ref.exists():
                faltas.append("quadro de referência não encontrado: %s" % m["ref"])
                ref = None
        cards.append((m, img, ref))
    if faltas:
        sys.exit("erro: a página não foi gerada.\n  - " + "\n  - ".join(faltas))

    tem_ref = any(r for _, _, r in cards)
    P = ['<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">',
         "<title>%s · cards para aprovação</title><style>%s</style></head><body><main>" % (html.escape(d["titulo"]), CSS),
         "<h1>%s <mark>cards</mark> para aprovação</h1>" % html.escape(d["titulo"]),
         '<p class="sub">%s Cada imagem é um quadro real da cena, parado no momento-chave; só falta o movimento.</p>' % e(d.get("resumo", ""))]
    if d.get("decisoes"):
        P.append('<h2>Preciso que você decida</h2><div class="dec"><ol>%s</ol></div>' % "".join("<li>%s</li>" % e(x) for x in d["decisoes"]))
    P.append('<div class="mec"><b>O mecanismo do filme</b>%s</div>' % e(d.get("mecanismo", "")))
    if d.get("metodo_x_mundo"):
        P.append("<h2>O que vem da referência e o que é nosso</h2><table><tr><th>Papel</th><th>Na referência</th><th>No nosso</th></tr>%s</table>" %
                 "".join("<tr><td><b>%s</b></td><td>%s</td><td>%s</td></tr>" % (e(x["papel"]), e(x["referencia"]), e(x["nosso"])) for x in d["metodo_x_mundo"]))
    P.append('<h2>Os %d momentos</h2><div class="grade">' % len(cards))
    for m, img, ref in cards:
        num = m["id"].split("-")[0]
        if ref:
            fig = '<div class="par"><figure><img src="%s" alt=""><figcaption>referência</figcaption></figure><figure><img src="%s" alt=""><figcaption>nosso</figcaption></figure></div>' % (embutir(ref), embutir(img))
        else:
            fig = '<img src="%s" alt="">' % embutir(img)
        P.append('<div class="card%s">%s<div class="t"><div class="rot"><b><span class="n">%s</span> · %s</b><span class="j">%s</span></div>'
                 '<p><strong>Move primeiro:</strong> %s</p><p class="em"><strong>Emenda:</strong> %s</p></div></div>' % (" largo" if ref else "", fig, html.escape(num), e(m["nome"]), e(m.get("janela", "")), e(m.get("move", "")), e(m.get("emenda", ""))))
    P.append("</div>")
    if d.get("sistema") or d.get("proibicoes"):
        P.append('<h2>Sistema de design e proibições</h2><div class="duas">')
        if d.get("sistema"):
            P.append("<table><tr><th>Token</th><th>Medido na referência</th><th>No nosso</th></tr>%s</table>" %
                     "".join("<tr><td><b>%s</b></td><td>%s</td><td>%s</td></tr>" % (e(x["token"]), e(x.get("medido", "")), e(x.get("nosso", ""))) for x in d["sistema"]))
        if d.get("proibicoes"):
            P.append('<div class="box"><h3>Este filme nunca faz</h3><ul>%s</ul></div>' % "".join("<li>%s</li>" % e(x) for x in d["proibicoes"]))
        P.append("</div>")
    if d.get("risco") or d.get("metas"):
        P.append('<h2>Risco e metas</h2><div class="duas">')
        if d.get("risco"):
            P.append('<div class="box risco"><h3>Maior risco e plano B</h3><ul><li><b>Risco:</b> %s</li><li><b>Plano B:</b> %s</li></ul></div>' % (e(d["risco"].get("qual", "")), e(d["risco"].get("plano_b", ""))))
        if d.get("metas"):
            P.append("<table><tr><th>Medida de movimento</th><th>Referência</th><th>Nossa meta</th></tr>%s</table>" %
                     "".join("<tr><td><b>%s</b></td><td>%s</td><td>%s</td></tr>" % (e(x["medida"]), e(x.get("referencia", "")), e(x.get("meta", ""))) for x in d["metas"]))
        P.append("</div>")
    if d.get("copy"):
        P.append("<h2>Texto em tela (contrato)</h2><pre>%s\n\nNada além disso aparece em tela.</pre>" % html.escape("\n".join(d["copy"])))
    P.append("</main></body></html>")
    saida = raiz / "cards.html"
    saida.write_text("\n".join(P), encoding="utf-8")
    print("cards.html: %d momento(s)%s · %.1f MB · %s" % (len(cards), " com a referência ao lado" if tem_ref else "", saida.stat().st_size / 1e6, saida))


if __name__ == "__main__":
    main()
