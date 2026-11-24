#!/usr/bin/env python3
"""Teste de aceite: o nosso filme contra a referência, pela mesma régua.

    comparar.py REFERENCIA.mp4 NOSSO.mp4 [--saida aceite] [--modo fidelidade|estilo] [--metas metas.json]
                [--tempos 0.5 2.0 6.0] [--tira 2.0 3.0] [--sobrepor 4.5] [--caixa x0 y0 x1 y1]
    comparar.py REFERENCIA.jpg NOSSO.jpg [--saida aceite]      referência parada: só cor e composição

Sai, em aceite/:
    pares.jpg            referência em cima, nosso embaixo, nos mesmos instantes
    tira-A-B.jpg         quadros consecutivos de um trecho (para comparar a física de um movimento)
    sobreposto-T.jpg     nosso, referência e os dois a 50% (para conferir enquadramento com câmera parada)
    ACEITE.md, aceite.json

Modos:
    fidelidade   a pessoa pediu "igual", "bem próximo", "o mesmo sistema visual": movimento E cor são portão.
    estilo       fica o método, o mundo e a paleta são outros: só o movimento é portão; a cor vai como informação.

O que o teste mede: ritmo (onde soca, onde respira, onde o movimento mora no quadro) e cor em números.
O que ele NÃO mede: se a animação é boa, se a luz modela, se o material convence, se o texto está legível.
Isso é olho: a folha de quadros e o lado a lado existem para isso. Um filme que passa aqui ainda pode estar ruim;
um filme que reprova aqui tem um defeito com nome.

Durações diferentes: os instantes são casados em proporção (metade do nosso × metade da referência), a não ser com
--mapa igual. Metas próprias (--metas) substituem as genéricas quando a referência pede outra régua, por exemplo
{"amplitude": [1.2, 2.6], "quase_parada_min": 0, "energia_fim_max": 0.5}.
Sai com código 1 se algum portão reprovar.
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _comum import (np, Image, sonda, extrair, abrir, energia, assinatura, estat_cor, paleta, delta_e, etiqueta, barra, REGIOES)


IMAGENS = (".jpg", ".jpeg", ".png", ".webp")


def comparar_imagens(a, out):
    """Referência parada: compara cor e composição de dois quadros. Não há ritmo para medir."""
    r = Image.open(a.referencia).convert("RGB")
    n = Image.open(a.nosso).convert("RGB")
    W = 960
    Hh = round(W * r.height / r.width)
    if abs(r.width / r.height - n.width / n.height) > 0.02:
        print("aviso: formatos diferentes (referência %.3f, nosso %.3f). O nosso será encaixado pela largura e cortado ou completado na altura para a sobreposição." % (r.width / r.height, n.width / n.height))
    rr = r.resize((W, Hh), Image.LANCZOS)
    hn = round(W * n.height / n.width)
    nn_ = n.resize((W, hn), Image.LANCZOS)
    tela = Image.new("RGB", (W, Hh), (0, 0, 0))
    tela.paste(nn_, (0, (Hh - hn) // 2))
    nn_ = tela
    ar, an = np.asarray(rr, np.float32) / 255, np.asarray(nn_, np.float32) / 255
    cr, cn = estat_cor([ar]), estat_cor([an])
    metas = json.loads(Path(a.metas).read_text()) if a.metas else {}
    portoes = []

    def portao(nome, ok, nosso, ref, meta):
        portoes.append({"nome": nome, "ok": bool(ok), "nosso": nosso, "referencia": ref, "meta": meta, "portao": a.modo == "fidelidade"})
    for p, tol in (("p5", 0.05), ("p50", 0.05), ("p95", 0.07)):
        t = metas.get("lum_tol", tol)
        portao("Luminância %s" % p, abs(cn["lum"][p] - cr["lum"][p]) <= t, "%.3f" % cn["lum"][p], "%.3f" % cr["lum"][p], "± %.2f" % t)
    t = metas.get("rgb_tol", 0.07)
    portao("Razão R:G:B", max(abs(cn["razao_rgb"][1] - cr["razao_rgb"][1]), abs(cn["razao_rgb"][2] - cr["razao_rgb"][2])) <= t, "1 : %.2f : %.2f" % tuple(cn["razao_rgb"][1:]), "1 : %.2f : %.2f" % tuple(cr["razao_rgb"][1:]), "± %.2f por canal" % t)
    t = metas.get("sat_tol", 0.08)
    portao("Saturação média", abs(cn["saturacao"] - cr["saturacao"]) <= t, "%.2f" % cn["saturacao"], "%.2f" % cr["saturacao"], "± %.2f" % t)
    pr, pn = paleta([ar], 8), paleta([an], 8)
    casadas = [(c, min(pn, key=lambda x: delta_e(c["hex"], x["hex"]))) for c in pr]
    casadas = [(c, m, delta_e(c["hex"], m["hex"])) for c, m in casadas]
    medio = float(np.average([d for _, _, d in casadas], weights=[c["fatia"] for c, _, _ in casadas]))
    t = metas.get("paleta_tol", 8.0)
    portao("Paleta (ΔE médio pesado pela fatia)", medio <= t, "%.1f" % medio, "0", "≤ %.1f" % t)
    # composição: onde está a luz. Luminância em grade 6×6, correlação entre os dois quadros
    def grade6(x):
        g = (x @ np.array([0.2126, 0.7152, 0.0722], np.float32)) if False else (x[..., 0] * 0.2126 + x[..., 1] * 0.7152 + x[..., 2] * 0.0722)
        h, w = g.shape
        return np.array([[g[j * h // 6:(j + 1) * h // 6, i * w // 6:(i + 1) * w // 6].mean() for i in range(6)] for j in range(6)])
    gr, gn = grade6(ar), grade6(an)
    corr = float(np.corrcoef(gr.ravel(), gn.ravel())[0, 1])
    t = metas.get("composicao_min", 0.8)
    portao("Composição (onde está a luz, grade 6×6)", corr >= t, "%.2f" % corr, "1,00", "≥ %.2f" % t)

    Wd = Image.new("RGB", (W * 2, Hh * 2), (18, 18, 18))
    Wd.paste(etiqueta(nn_.copy(), "NOSSO"), (0, 0))
    Wd.paste(etiqueta(rr.copy(), "REFERÊNCIA"), (W, 0))
    Wd.paste(etiqueta(Image.blend(nn_, rr, 0.5), "os dois a 50%"), (0, Hh))
    dif = np.abs(an - ar).mean(-1) * 255
    Wd.paste(etiqueta(Image.fromarray(np.clip(dif * 3, 0, 255).astype("uint8")).convert("RGB"), "diferença (claro = onde não bate)"), (W, Hh))
    Wd.save(out / "sobreposto.jpg", quality=88)
    valem = [p for p in portoes if p["portao"]]
    reprov = [p for p in valem if not p["ok"]]
    L = ["# Teste de aceite: nosso quadro × referência parada\n",
         "*Modo **%s**. A referência é uma imagem: compara-se cor e composição; não há ritmo para medir.*\n" % a.modo,
         "## Veredito: %s\n" % ("**PASSA** nos %d portões" % len(valem) if not reprov else "**REPROVA** em %d de %d portões: %s" % (len(reprov), len(valem), "; ".join(p["nome"] for p in reprov))),
         "| Medida | Nosso | Referência | Meta | |\n|---|---|---|---|---|"]
    for p in portoes:
        L.append("| %s | %s | %s | %s | %s |" % (p["nome"], p["nosso"], p["referencia"], p["meta"], ("ok" if p["ok"] else "**reprova**") if p["portao"] else ("ok (só informa)" if p["ok"] else "difere (só informa)")))
    L.append("\n## Onde está a luz (luminância média em grade 6×6; referência → nosso)\n\n```")
    for j in range(6):
        L.append("   ".join("%.2f→%.2f" % (gr[j, i], gn[j, i]) for i in range(6)))
    L.append("```\n\n## Paleta (cada cor da referência e a nossa mais próxima)\n\n| Referência | Fatia | Nossa | ΔE | |\n|---|---|---|---|---|")
    for c, m, d in casadas:
        L.append("| `%s` | %d%% | `%s` | %.1f | %s |" % (c["hex"], round(c["fatia"] * 100), m["hex"], d, "igual a olho" if d < 3 else "próxima" if d < 8 else "outra cor"))
    L.append("\n## Arquivos\n\n- `sobreposto.jpg` (nosso, referência, os dois a 50% e o mapa de diferença)")
    L.append("\n## O que este teste não mede\n\nForma, material, foco e acabamento. O mapa de diferença mostra ONDE não bate; o porquê é olho, com os dois quadros lado a lado e as medidas de `sonda.py` feitas nos dois.")
    (out / "ACEITE.md").write_text("\n".join(L) + "\n")
    (out / "aceite.json").write_text(json.dumps({"modo": a.modo, "tipo": "imagem", "passa": not reprov, "portoes": portoes, "cor": {"referencia": cr, "nosso": cn}}, ensure_ascii=False, indent=1))
    print(("PASSA" if not reprov else "REPROVA") + " · %d portões · %s" % (len(valem), out / "ACEITE.md"))
    for p in portoes:
        print("  %-44s nosso %-18s ref %-18s meta %-16s %s" % (p["nome"], p["nosso"], p["referencia"], p["meta"], ("ok" if p["ok"] else "REPROVA") if p["portao"] else "(informa)"))
    sys.exit(1 if reprov else 0)


def carregar(video, pasta):
    info = sonda(video)
    quadros, fps = extrair(video, pasta, 960, info["fps"] if info["quadros"] <= 2400 else 12.0)
    e, er = energia(quadros)
    return {"info": info, "quadros": quadros, "fps": fps, "e": e, "er": er, "sig": assinatura(e, fps), "dur": len(quadros) / fps}


def quadro(v, t):
    return v["quadros"][min(len(v["quadros"]) - 1, max(0, int(round(t * v["fps"]))))]


def celula(caminho, rot, caixa, tw):
    im = Image.open(caminho).convert("RGB")
    if caixa:
        sx, sy = im.width / caixa[4], im.height / caixa[5]
        im = im.crop((int(caixa[0] * sx), int(caixa[1] * sy), int(caixa[2] * sx), int(caixa[3] * sy)))
    th = int(round(im.height * tw / im.width))
    return etiqueta(im.resize((tw, th), Image.LANCZOS), rot, tam=max(11, tw // 24))


def grade(pares, saida, colunas, tw=400):
    """pares = [(img_ref, img_nosso)]: referência em cima, nosso embaixo."""
    th = max(max(a.height, b.height) for a, b in pares)
    colunas = min(colunas, len(pares))
    linhas = (len(pares) + colunas - 1) // colunas
    W = Image.new("RGB", (colunas * tw, linhas * (th * 2 + 8)), (18, 18, 18))
    for i, (a, b) in enumerate(pares):
        x, y = (i % colunas) * tw, (i // colunas) * (th * 2 + 8)
        W.paste(a, (x, y))
        W.paste(b, (x, y + th))
    W.save(saida, quality=88)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("referencia")
    ap.add_argument("nosso")
    ap.add_argument("--saida", default="aceite")
    ap.add_argument("--modo", choices=["fidelidade", "estilo"], default="fidelidade")
    ap.add_argument("--mapa", choices=["proporcional", "igual"], default="proporcional")
    ap.add_argument("--metas", default=None)
    ap.add_argument("--tempos", type=float, nargs="*", help="instantes da REFERÊNCIA para os pares (padrão: 8, espalhados)")
    ap.add_argument("--tira", type=float, nargs=2, action="append", metavar=("DE", "ATE"), help="trecho da referência para a tira de quadros consecutivos")
    ap.add_argument("--sobrepor", type=float, nargs="*", default=[], help="instantes da referência para a sobreposição a 50%%")
    ap.add_argument("--caixa", type=int, nargs=4, metavar=("X0", "Y0", "X1", "Y1"), help="recorte, em px do quadro da referência extraído pela perícia (1280 de largura)")
    a = ap.parse_args()

    out = Path(a.saida)
    out.mkdir(parents=True, exist_ok=True)
    if a.referencia.lower().endswith(IMAGENS):
        if not a.nosso.lower().endswith(IMAGENS):
            sys.exit("a referência é uma imagem: passe também um QUADRO nosso (um card ou `node render.mjs at T`), não o vídeo.")
        comparar_imagens(a, out)
    R = carregar(a.referencia, out / ".quadros-ref")
    N = carregar(a.nosso, out / ".quadros-nosso")
    k = (N["dur"] / R["dur"]) if a.mapa == "proporcional" else 1.0
    tn = lambda t: t * k
    metas = json.loads(Path(a.metas).read_text()) if a.metas else {}
    caixa = None
    if a.caixa:
        caixa = list(a.caixa) + [1280, round(1280 * R["info"]["altura"] / R["info"]["largura"])]

    linhas, portoes = [], []

    def portao(nome, ok, nosso, ref, meta, vale=True):
        portoes.append({"nome": nome, "ok": bool(ok), "nosso": nosso, "referencia": ref, "meta": meta, "portao": vale})

    # ---------------- movimento
    sr, sn = R["sig"], N["sig"]
    amp = metas.get("amplitude")
    if isinstance(amp, list):
        portao("Amplitude (pico ÷ mediana)", amp[0] <= sn["amplitude"] <= amp[1], "%s×" % sn["amplitude"], "%s×" % sr["amplitude"], "entre %s× e %s×" % (amp[0], amp[1]))
    else:
        alvo = amp if amp is not None else round(0.7 * sr["amplitude"], 2)
        portao("Amplitude (pico ÷ mediana)", sn["amplitude"] >= alvo, "%s×" % sn["amplitude"], "%s×" % sr["amplitude"], "≥ %s×" % alvo)
    qp = metas.get("quase_parada_min", max(0.0, round(sr["quase_parada"] - 0.10, 3)))      # a referência é a régua: sem piso fixo
    portao("Quase-parada", sn["quase_parada"] >= qp, "%d%%" % round(sn["quase_parada"] * 100), "%d%%" % round(sr["quase_parada"] * 100), "≥ %d%%" % round(qp * 100))
    if "quase_parada_max" in metas:
        portao("Quase-parada (teto)", sn["quase_parada"] <= metas["quase_parada_max"], "%d%%" % round(sn["quase_parada"] * 100), "%d%%" % round(sr["quase_parada"] * 100), "≤ %d%%" % round(metas["quase_parada_max"] * 100))
    # picos por 10 s, para durações diferentes não distorcerem
    pr, pn = sr["n_picos"] / R["dur"] * 10, sn["n_picos"] / N["dur"] * 10
    pm = metas.get("picos_por_10s_min", round(0.7 * pr, 2))
    portao("Picos (por 10 s)", pn >= pm - 1e-9, "%.1f (%d no filme)" % (pn, sn["n_picos"]), "%.1f (%d)" % (pr, sr["n_picos"]), "≥ %.1f" % pm)
    cr, cn = len(sr["cortes"]), len(sn["cortes"])
    tol = metas.get("cortes_tolerancia", max(1, round(0.25 * cr)))
    portao("Cortes secos", abs(cn - cr * (N["dur"] / R["dur"] if a.mapa == "igual" else 1)) <= tol, cn, cr, "%d ± %d" % (cr, tol))
    # forma do arco: o perfil do nosso, reamostrado no tempo da referência, tem que subir e descer nos mesmos lugares
    pr_, pn_ = np.array(sr["perfil"]), np.array(sn["perfil"])
    pn_r = np.interp(np.linspace(0, 1, len(pr_)), np.linspace(0, 1, len(pn_)), pn_)
    corr = float(np.corrcoef(pr_, pn_r)[0, 1]) if pr_.std() > 1e-6 and pn_r.std() > 1e-6 else 0.0
    cmin = metas.get("forma_min", 0.5 if a.modo == "fidelidade" else 0.25)
    portao("Forma do arco (correlação do perfil)", corr >= cmin, "%.2f" % corr, "1,00", "≥ %.2f" % cmin, vale=(a.modo == "fidelidade" or "forma_min" in metas))
    razao_e = sn["media"] / max(sr["media"], 1e-6)
    emin, emax = metas.get("energia_razao", [0.5, 2.0])
    portao("Energia média (nosso ÷ referência)", emin <= razao_e <= emax, "%.2f (%.2f)" % (razao_e, sn["media"]), "%.2f" % sr["media"], "entre %.1f e %.1f" % (emin, emax), vale=(a.modo == "fidelidade"))
    if "energia_fim_max" in metas:       # último segundo calmo (filmes que fecham parados)
        fim = float(N["e"][-int(N["fps"]):].mean()) / max(sn["mediana"], 1e-6)
        portao("Último segundo ÷ mediana", fim <= metas["energia_fim_max"], "%.2f" % fim, "-", "≤ %.2f" % metas["energia_fim_max"])

    # regiões: onde o movimento mora
    rr, rn = R["er"].mean(0), N["er"].mean(0)
    fr, fn = rr / max(rr.sum(), 1e-6), rn / max(rn.sum(), 1e-6)
    dist_reg = float(np.abs(fr - fn).sum() / 2)          # 0 = mesma distribuição · 1 = lugares opostos
    rmax = metas.get("regioes_max", 0.30)
    portao("Onde o movimento mora (diferença de distribuição 3×3)", dist_reg <= rmax, "%.2f" % dist_reg, "0,00", "≤ %.2f" % rmax, vale=(a.modo == "fidelidade"))

    # ---------------- cor
    tempos = a.tempos or [R["dur"] * (i + 0.5) / 8 for i in range(8)]
    am_r = [abrir(quadro(R, t), (320, 180)) for t in np.linspace(0.02 * R["dur"], 0.98 * R["dur"], 40)]
    am_n = [abrir(quadro(N, tn(t)), (320, 180)) for t in np.linspace(0.02 * R["dur"], 0.98 * R["dur"], 40)]
    cr_, cn_ = estat_cor(am_r), estat_cor(am_n)
    vale_cor = a.modo == "fidelidade"
    for p, tolp in (("p5", 0.05), ("p50", 0.05), ("p95", 0.07)):
        d = cn_["lum"][p] - cr_["lum"][p]
        portao("Luminância %s" % p, abs(d) <= metas.get("lum_tol", tolp), "%.3f" % cn_["lum"][p], "%.3f" % cr_["lum"][p], "± %.2f" % metas.get("lum_tol", tolp), vale=vale_cor)
    dg, db = cn_["razao_rgb"][1] - cr_["razao_rgb"][1], cn_["razao_rgb"][2] - cr_["razao_rgb"][2]
    portao("Razão R:G:B", max(abs(dg), abs(db)) <= metas.get("rgb_tol", 0.07), "1 : %.2f : %.2f" % tuple(cn_["razao_rgb"][1:]), "1 : %.2f : %.2f" % tuple(cr_["razao_rgb"][1:]), "± %.2f por canal" % metas.get("rgb_tol", 0.07), vale=vale_cor)
    portao("Saturação média", abs(cn_["saturacao"] - cr_["saturacao"]) <= metas.get("sat_tol", 0.08), "%.2f" % cn_["saturacao"], "%.2f" % cr_["saturacao"], "± %.2f" % metas.get("sat_tol", 0.08), vale=vale_cor)
    pal_r, pal_n = paleta(am_r, 6), paleta(am_n, 6)
    casadas = []
    for c in pal_r:
        m = min(pal_n, key=lambda x: delta_e(c["hex"], x["hex"]))
        casadas.append((c, m, delta_e(c["hex"], m["hex"])))
    pior = max(d for _, _, d in casadas)
    medio = float(np.average([d for _, _, d in casadas], weights=[c["fatia"] for c, _, _ in casadas]))
    portao("Paleta (ΔE médio pesado pela fatia)", medio <= metas.get("paleta_tol", 8.0), "%.1f" % medio, "0", "≤ %.1f" % metas.get("paleta_tol", 8.0), vale=vale_cor)

    # ---------------- imagens
    tw = 400
    pares = [(celula(quadro(R, t), "REF %.2fs" % t, caixa, tw), celula(quadro(N, tn(t)), "NOSSO %.2fs" % tn(t), caixa, tw)) for t in tempos]
    grade(pares, out / "pares.jpg", colunas=4, tw=tw)
    arquivos = ["pares.jpg"]
    for de, ate in (a.tira or []):
        ts = np.arange(de, ate + 1e-6, 1 / R["fps"])
        if len(ts) > 36:
            ts = ts[::int(np.ceil(len(ts) / 36))]
        nome = "tira-%.2f-%.2f.jpg" % (de, ate)
        grade([(celula(quadro(R, t), "REF q%d" % round(t * R["fps"]), caixa, 320), celula(quadro(N, tn(t)), "NOSSO %.2fs" % tn(t), caixa, 320)) for t in ts], out / nome, colunas=6, tw=320)
        arquivos.append(nome)
    for t in a.sobrepor:
        r = Image.open(quadro(R, t)).convert("RGB").resize((960, 540), Image.LANCZOS)
        n = Image.open(quadro(N, tn(t))).convert("RGB").resize((960, 540), Image.LANCZOS)
        W = Image.new("RGB", (1920, 1080), (18, 18, 18))
        W.paste(etiqueta(n.copy(), "NOSSO %.2fs" % tn(t)), (0, 0))
        W.paste(etiqueta(r.copy(), "REF %.2fs" % t), (960, 0))
        W.paste(etiqueta(Image.blend(n, r, 0.5), "os dois a 50%"), (0, 540))
        dif = np.abs(np.asarray(n, float) - np.asarray(r, float)).mean(-1)
        W.paste(etiqueta(Image.fromarray(np.clip(dif * 3, 0, 255).astype("uint8")).convert("RGB"), "diferença (claro = onde não bate)"), (960, 540))
        nome = "sobreposto-%.2f.jpg" % t
        W.save(out / nome, quality=88)
        arquivos.append(nome)

    # ---------------- relatório
    valem = [p for p in portoes if p["portao"]]
    reprov = [p for p in valem if not p["ok"]]
    L = ["# Teste de aceite: nosso × referência\n",
         "*Modo **%s**. Referência %.2f s, nosso %.2f s%s. Medido pela mesma ferramenta nos dois lados.*\n" % (a.modo, R["dur"], N["dur"], " (instantes casados em proporção)" if abs(k - 1) > 0.03 else ""),
         "## Veredito: %s\n" % ("**PASSA** nos %d portões" % len(valem) if not reprov else "**REPROVA** em %d de %d portões: %s" % (len(reprov), len(valem), "; ".join(p["nome"] for p in reprov))),
         "| Medida | Nosso | Referência | Meta | |\n|---|---|---|---|---|"]
    for p in portoes:
        L.append("| %s | %s | %s | %s | %s |" % (p["nome"], p["nosso"], p["referencia"], p["meta"], ("ok" if p["ok"] else "**reprova**") if p["portao"] else ("ok (só informa)" if p["ok"] else "difere (só informa)")))
    L.append("\n## Perfil de energia (referência `#`, nosso `*`, no tempo da referência)\n\n```")
    esc = max(pr_.max(), pn_r.max())
    for i in range(len(pr_)):
        L.append("%5.1fs  %-22s %5.2f | %-22s %5.2f" % (i * sr["balde_s"], barra(pr_[i], esc, 22), pr_[i], barra(pn_r[i], esc, 22, "*"), pn_r[i]))
    L.append("```\n\n## Onde o movimento mora (fatia da energia por região; referência → nosso)\n\n```")
    for j in range(3):
        L.append("   ".join("%-9s %2d%% → %2d%%" % (REGIOES[j * 3 + i], round(fr[j * 3 + i] * 100), round(fn[j * 3 + i] * 100)) for i in range(3)))
    L.append("```\n\n## Paleta (cada cor da referência e a nossa mais próxima)\n\n| Referência | Fatia | Nossa | ΔE | |\n|---|---|---|---|---|")
    for c, m, d in casadas:
        L.append("| `%s` | %d%% | `%s` | %.1f | %s |" % (c["hex"], round(c["fatia"] * 100), m["hex"], d, "igual a olho" if d < 3 else "próxima" if d < 8 else "outra cor"))
    L.append("\n## Como consertar o que reprovou\n")
    dicas = {
        "Amplitude": "Não acelere tudo: isso sobe a mediana junto e a amplitude não muda. Escolha UM momento para socar (mais área do quadro mudando em menos quadros) e acalme o que vem antes e depois.",
        "Quase-parada": "Falta respiro. Segure a pose depois de cada soco; tire flutuação, giro e câmera lenta dos trechos de pausa (um movimento contínuo de câmera mexe o quadro inteiro e apaga a pausa).",
        "Picos": "Faltam socos, ou eles viraram um platô. Encurte a entrada dos elementos principais e aumente a área que muda no pico; o tamanho do elemento conta mais que a velocidade.",
        "Cortes": "Número de cortes diferente da referência: confira se há crossfade onde ela corta seco, ou plano a mais.",
        "Forma do arco": "O filme soca e respira em lugares diferentes da referência. Compare o perfil acima linha a linha e mova os instantes na tabela de tempos.",
        "Energia média": "Movimento demais ou de menos no geral: tamanho do herói no quadro, velocidade da câmera, quantidade de elementos vivos no fundo.",
        "Onde o movimento": "O movimento está em outra parte do quadro. Veja a tabela de regiões: algo que na referência passa num canto está no centro (ou falta), ou a composição está deslocada.",
        "Luminância": "Antes de mexer em luz ou gradação, confira com `sonda.py ponto` se a cor ACESA de cada material bate com a da referência, e com `sonda.py razao` se o contraste da luz no herói bate. Se as duas batem e o herói é outro objeto, a diferença de percentil é de ÁREA (quanto do quadro cada cor ocupa), não é defeito: registre e não mude o token para passar. Se não batem: corrija a cor do material, depois a exposição (p50), depois contraste em torno do pivô (p5 e p95), depois piso e teto.",
        "Razão R:G:B": "Temperatura diferente. Ajuste a cor das luzes (chave e preenchimento) ou, por último, `tinta` no pipeline.",
        "Saturação": "Tom errado (ACES dessatura os claros; o neutro preserva), ou materiais com cor lavada pelo ambiente.",
        "Paleta": "Veja a tabela de paleta: as linhas marcadas 'outra cor' são os tokens a corrigir.",
    }
    usados = False
    for p in reprov:
        for chave, d in dicas.items():
            if p["nome"].startswith(chave):
                L.append("- **%s:** %s" % (p["nome"], d))
                usados = True
    if not usados:
        L.append("Nada reprovou nos portões. Agora olhe: `pares.jpg` e a folha de quadros do nosso filme. Os números não veem luz chapada, peça atravessando outra, texto cortado nem animação dura.")
    L.append("\n## Arquivos\n\n" + "\n".join("- `%s`" % f for f in arquivos))
    L.append("\n## O que este teste não mede\n\nRitmo e cor não são qualidade. Luz que modela, material, proporção, legibilidade do texto, fluidez da animação e se o mecanismo se lê em uma frase continuam sendo conferidos no olho, quadro a quadro, e por um revisor que não construiu o filme.")
    (out / "ACEITE.md").write_text("\n".join(L) + "\n")
    (out / "aceite.json").write_text(json.dumps({"modo": a.modo, "passa": not reprov, "portoes": portoes, "referencia": {k2: v for k2, v in sr.items()}, "nosso": {k2: v for k2, v in sn.items()},
                                                 "cor": {"referencia": cr_, "nosso": cn_}, "regioes": {"referencia": [round(float(v), 3) for v in fr], "nosso": [round(float(v), 3) for v in fn]}}, ensure_ascii=False, indent=1))
    print(("PASSA" if not reprov else "REPROVA") + " · %d portões · %s" % (len(valem), out / "ACEITE.md"))
    for p in portoes:
        print("  %-52s nosso %-18s ref %-16s meta %-16s %s" % (p["nome"], p["nosso"], p["referencia"], p["meta"], ("ok" if p["ok"] else "REPROVA") if p["portao"] else "(informa)"))
    sys.exit(1 if reprov else 0)


if __name__ == "__main__":
    main()
