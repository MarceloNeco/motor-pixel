#!/usr/bin/env python3
"""Perícia medida de um vídeo de referência, num comando.

    pericia.py REFERENCIA.mp4 | LINK | IMAGEM.jpg  [--destino pericia] [--largura 1280]

Com uma IMAGEM (a referência é um quadro só) mede cor, paleta, fundo, foco, vinheta e ruído, gera a régua, e avisa
que o movimento será proposta.

Sai, em pericia/:
    ref/referencia.mp4, ref/LINK.txt   o vídeo (terceiro: nunca vai para o acervo nem para o código)
    quadros/todos/q00001.jpg ...       todos os quadros (a leitura quadro a quadro depende deles)
    quadros/folha-1fps.jpg             visão geral
    quadros/folha-4fps-NN.jpg          onde cada momento começa e acaba (conte quadros aqui: 1 quadro = 250 ms)
    quadros/chave-NN.jpg               um quadro do meio de cada plano (ou de cada trecho calmo)
    quadros/regua-NN.jpg               o mesmo quadro com uma régua de pixels, para marcar pontos (camera.py, sonda.py)
    medido.json  ·  MEDIDO.md          os números e a lista do que ainda tem que ser lido no olho

O que mede: ficha, cortes e planos, movimento (perfil, amplitude, quase-parada, picos, por região do quadro),
movimento de câmera por plano (parada, desliza, aproxima), cor (percentis de luminância, razão R:G:B, saturação,
paleta perceptual, fundo), nitidez por faixa (profundidade de campo), vinheta e ruído fino.
O que NÃO mede (e por isso é pendência sua): lente e posição da câmera, direção e dureza da luz, materiais,
proporções, mecanismo. Para isso existem camera.py e sonda.py, e o roteiro em references/pericia-3d.md.
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import argparse
import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _comum import (np, Image, ImageDraw, precisa, sonda, extrair, abrir, luminancia, energia, assinatura, estat_cor, paleta,
                    hexa, folha, etiqueta, barra, REGIOES, _fonte)


IMAGENS = (".jpg", ".jpeg", ".png", ".webp")


def pericia_de_imagem(origem, dest, largura):
    """A referência é um quadro só: mede tudo o que um quadro tem (cor, paleta, fundo, foco, vinheta, ruído) e deixa
    claro que não há movimento para medir."""
    src = Path(origem).expanduser()
    (dest / "ref").mkdir(parents=True, exist_ok=True)
    (dest / "quadros" / "todos").mkdir(parents=True, exist_ok=True)
    shutil.copyfile(src, dest / "ref" / ("referencia" + src.suffix.lower()))
    im = Image.open(src).convert("RGB")
    if im.width != largura:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    q = dest / "quadros" / "todos" / "q00001.jpg"
    im.save(q, quality=95)
    shutil.copyfile(q, dest / "quadros" / "chave-01.jpg")
    regua(q, dest / "quadros" / "regua-01.jpg")
    Wq, Hq = im.size
    peq = [abrir(q, (320, round(320 * Hq / Wq)))]
    med = [abrir(q, (640, round(640 * Hq / Wq)))]
    vin, ruido = vinheta_e_ruido(med)
    cor, pal, fd, nit = estat_cor(peq), paleta(peq, k=8), fundo(peq), nitidez_por_faixa(med)
    orig = Image.open(src).size
    json.dump({"ficha": {"tipo": "imagem", "largura": orig[0], "altura": orig[1]}, "quadros": {"pasta": "quadros/todos", "n": 1, "largura": Wq, "altura": Hq},
               "geral": {"cor": cor, "paleta": pal, "fundo": fd, "vinheta_cantos_sobre_centro": vin, "ruido_fino": ruido, "nitidez": nit}},
              open(dest / "medido.json", "w"), ensure_ascii=False, indent=1)
    L = ["# Medido na referência (imagem parada)\n",
         "*Gerado por `pericia.py`. A referência é UM quadro: não há movimento para medir. O movimento do nosso filme será proposta, declarada como tal na perícia e nos cards. Se o vídeo de origem aparecer, rode a perícia de novo nele. A imagem é de terceiro: fica em `ref/` e não vai para o código nem para o acervo.*\n",
         "## Ficha\n",
         "- Imagem de %d×%d (formato %.3f). Quadro de trabalho: `quadros/chave-01.jpg` e `quadros/regua-01.jpg`, %d×%d. **As coordenadas de `camera.py` e `sonda.py` valem nesse tamanho.**\n" % (orig[0], orig[1], orig[0] / orig[1], Wq, Hq),
         "## Cor (em espaço de exibição)\n",
         "- Luminância: p1 %.3f · p5 %.3f · p25 %.3f · **p50 %.3f** · p75 %.3f · p95 %.3f · p99 %.3f" % tuple(cor["lum"][k] for k in ("p1", "p5", "p25", "p50", "p75", "p95", "p99")),
         "- Razão R : G : B = 1 : %.2f : %.2f · saturação média %.2f" % (cor["razao_rgb"][1], cor["razao_rgb"][2], cor["saturacao"]),
         "- Moldura do quadro: borda `%s`, cantos `%s`, meio das bordas `%s`" % (fd["borda"], fd["cantos"], fd["meio_das_bordas"]),
         "\nPaleta dominante (agrupada em espaço perceptual). **Fatia não é papel:** o acento costuma ser a menor fatia e a cor mais saturada.\n",
         "| Cor | Fatia | Luminância | Croma |\n|---|---|---|---|"]
    for c in pal:
        L.append("| `%s` | %d%% | %.2f | %.2f |" % (c["hex"], round(c["fatia"] * 100), c["lum"], c["croma"]))
    L += ["\n## Lente e acabamento\n",
          "- Nitidez por faixa, do topo à base (1 = a mais nítida): %s → **%s**" % (" · ".join("%.2f" % v if v is not None else "vazia" for v in nit["faixas_topo_a_base"]), nit["leitura"]),
          "- A medida por faixa não vê foco em PROFUNDIDADE (fundo mole atrás de um herói nítido na mesma altura do quadro): compare no olho a borda do herói com a de um objeto do fundo, e meça a largura das duas com `sonda.py linha`.",
          "- Cantos ÷ centro em luminância: %.2f · ruído fino nas áreas lisas: %.2f níveis\n" % (vin, ruido),
          "## O que este arquivo NÃO mediu (leia e meça antes de construir)\n",
          "Siga `references/pericia-3d.md` (a ficha 3D vale inteira para uma imagem) e transforme cada item em número:\n",
          "- [ ] **Câmera:** ortográfica ou perspectiva, lente, altura e ângulo: marque 5 ou mais pontos na régua e rode `camera.py resolver`.",
          "- [ ] **Luz:** cada fonte que aparece ou se deduz (posição, cor, tamanho); razão claro ÷ sombra no herói; densidade e penumbra das sombras: `sonda.py`.",
          "- [ ] **Materiais:** largura e cor do brilho de cada material principal; o que reflete o quê.",
          "- [ ] **Proporções:** quanto do quadro o herói ocupa; tamanho de cada elemento em relação a ele; inventário do que há em cena.",
          "- [ ] **Foco em profundidade:** o que está nítido, o que está mole e quanto (largura de borda em px).",
          "- [ ] **Como o herói se destaca.**",
          "- [ ] **Movimento: proposta.** Escreva o mecanismo do filme e os momentos; marque na perícia que não vieram da referência.",
          "\nNo fim, o aceite de uma referência parada compara só cor e composição: renderize o quadro equivalente e use `comparar.py REFERENCIA.jpg NOSSO.jpg`."]
    (dest / "MEDIDO.md").write_text("\n".join(L) + "\n")
    print("pronto (imagem parada): %s/MEDIDO.md · %d×%d · p50 %.3f · sem movimento para medir" % (dest, Wq, Hq, cor["lum"]["p50"]))


def obter(origem, destino):
    ref = destino / "ref"
    ref.mkdir(parents=True, exist_ok=True)
    alvo = ref / "referencia.mp4"
    if origem.startswith(("http://", "https://")):
        (ref / "LINK.txt").write_text(origem + "\n")
        if not alvo.exists():
            precisa("yt-dlp")
            r = subprocess.run(["yt-dlp", "-q", "--no-playlist", "-f", "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b", "--merge-output-format", "mp4",
                                "-o", str(alvo), origem])
            if r.returncode != 0 or not alvo.exists():
                sys.exit("erro: não consegui baixar. Baixe o arquivo à mão e passe o caminho; sem o arquivo não há perícia medida "
                         "(estudar só no navegador deixa os números da referência e os nossos incomparáveis).")
    else:
        src = Path(origem).expanduser()
        if not src.exists():
            sys.exit("erro: arquivo não encontrado: %s" % src)
        if not alvo.exists() or alvo.stat().st_size != src.stat().st_size:
            shutil.copyfile(src, alvo)
    return alvo


def deslocamento(a, b):
    """Translação entre dois quadros por correlação de fase. Devolve (dx, dy, confiança)."""
    h, w = a.shape
    jan = np.outer(np.hanning(h), np.hanning(w))
    A, B = np.fft.fft2((a - a.mean()) * jan), np.fft.fft2((b - b.mean()) * jan)
    R = A * np.conj(B)
    R /= np.abs(R) + 1e-9
    c = np.abs(np.fft.ifft2(R))
    py, px = np.unravel_index(c.argmax(), c.shape)
    conf = float(c.max() / (c.mean() + 1e-9))
    dy = py - h if py > h // 2 else py
    dx = px - w if px > w // 2 else px
    return -float(dx), -float(dy), conf


def camera_do_plano(quadros, fps, passo):
    """Soma o deslizamento (pan) e a aproximação (zoom) do plano. A aproximação sai da divergência dos quadrantes."""
    W, H = 256, 144
    centros = [(-W / 4, -H / 4), (W / 4, -H / 4), (-W / 4, H / 4), (W / 4, H / 4)]
    cortes_q = [(slice(0, H // 2), slice(0, W // 2)), (slice(0, H // 2), slice(W // 2, W)), (slice(H // 2, H), slice(0, W // 2)), (slice(H // 2, H), slice(W // 2, W))]
    pan, zoom, n, fraco, incoerente = np.zeros(2), 0.0, 0, 0, 0
    ant = None
    for q in quadros[::passo]:
        g = luminancia(abrir(q, (W, H)))
        if ant is not None:
            dx, dy, conf = deslocamento(ant, g)
            if conf < 6:
                fraco += 1
            else:
                pan += (dx, dy)
                div, sobra = [], []
                for (cx, cy), (sy, sx) in zip(centros, cortes_q):
                    qx, qy, qc = deslocamento(ant[sy, sx], g[sy, sx])
                    if qc >= 5:
                        div.append((((qx - dx) * cx + (qy - dy) * cy) / (cx * cx + cy * cy), qx - dx, qy - dy, cx, cy))
                if len(div) >= 3:
                    z = float(np.mean([d[0] for d in div]))
                    # o que sobra depois de explicar os quadrantes por deslize + aproximação: se for grande, quem se
                    # mexe é a cena (objetos entrando, montagem), não a câmera
                    sobra = [np.hypot(d[1] - z * d[3], d[2] - z * d[4]) for d in div]
                    if float(np.mean(sobra)) > 1.2:
                        incoerente += 1
                    else:
                        zoom += z
                else:
                    incoerente += 1
            n += 1
        ant = g
    dur = max(1e-6, n * passo / fps)
    pan_pct = float(np.hypot(*pan)) / W * 100
    zoom_pct = zoom * 100
    if n == 0:
        tipo = "plano curto demais"
    elif fraco > 0.6 * n or incoerente > 0.35 * n:
        tipo = "indeterminado (a cena muda demais para separar câmera de objeto: confira no olho)"
    elif pan_pct < 1.0 and abs(zoom_pct) < 1.5:
        tipo = "parada"
    else:
        partes = []
        if pan_pct >= 1.0:
            partes.append("desliza %.0f%% da largura" % pan_pct)
        if abs(zoom_pct) >= 1.5:
            partes.append("%s %.0f%%" % ("aproxima" if zoom_pct > 0 else "afasta", abs(zoom_pct)))
        tipo = "move: " + ", ".join(partes)
    return {"tipo": tipo, "pan_pct_largura": round(pan_pct, 1), "zoom_pct": round(zoom_pct, 1),
            "pan_pct_por_s": round(pan_pct / dur, 2), "zoom_pct_por_s": round(zoom_pct / dur, 2), "confianca_baixa": bool(fraco > 0.3 * max(n, 1) or incoerente > 0.2 * max(n, 1))}


def nitidez_por_faixa(imgs):
    """Nitidez das bordas em 5 faixas horizontais e 3 verticais (o 1% mais forte do laplaciano de cada faixa).
    Faixa sem conteúdo (só fundo liso) não é faixa desfocada: fica de fora da leitura. Centro bem mais nítido que
    topo e base, COM conteúdo nos três = profundidade de campo rasa ou tilt-shift de miniatura."""
    hs, vs, cont = [], [], []
    for a in imgs:
        g = luminancia(a) * 255
        lap = np.abs(-4 * g[1:-1, 1:-1] + g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:])
        h, w = lap.shape
        fx = [lap[i * h // 5:(i + 1) * h // 5] for i in range(5)]
        hs.append([float(np.percentile(f, 99)) for f in fx])
        cont.append([float((f > 8).mean()) for f in fx])
        vs.append([float(np.percentile(lap[:, i * w // 3:(i + 1) * w // 3], 99)) for i in range(3)])
    hs, vs, cont = np.mean(hs, 0), np.mean(vs, 0), np.mean(cont, 0)
    tem = [bool(c > 0.004) for c in cont]
    ref = max([v for v, t in zip(hs, tem) if t] or [1e-6])
    rel = [round(float(v / ref), 2) if t else None for v, t in zip(hs, tem)]
    meio = [v for v in rel[1:4] if v is not None]
    pontas = [v for v in (rel[0], rel[4]) if v is not None]
    if not meio or not pontas:
        leitura = "não dá para dizer: o topo e a base do quadro são fundo liso, sem nada para estar em foco ou fora dele (confira nos objetos)"
    elif max(meio) > 0 and max(pontas) < 0.4:
        leitura = "foco raso: o que há no topo e na base está bem mais mole que o meio (tilt-shift ou lente aberta)"
    elif max(pontas) < 0.65:
        leitura = "talvez foco raso: topo e base menos nítidos que o meio, o que também acontece quando ali só há texto, sombra ou fundo de pouco contraste (confira nos objetos)"
    else:
        leitura = "tudo nítido de cima a baixo"
    return {"faixas_topo_a_base": rel, "colunas_esq_a_dir": [round(float(v / max(vs.max(), 1e-6)), 2) for v in vs], "leitura": leitura}


def vinheta_e_ruido(imgs):
    cs, ruido = [], []
    for a in imgs:
        g = luminancia(a)
        h, w = g.shape
        k = max(4, h // 10)
        cantos = np.mean([g[:k, :k].mean(), g[:k, -k:].mean(), g[-k:, :k].mean(), g[-k:, -k:].mean()])
        centro = g[h // 2 - k:h // 2 + k, w // 2 - k:w // 2 + k].mean()
        cs.append(cantos / max(centro, 1e-3))
        # ruído fino: resíduo de alta frequência nos blocos mais lisos (onde não há textura da cena para confundir)
        b = 16
        res = g[1:-1, 1:-1] - (g[:-2, 1:-1] + g[2:, 1:-1] + g[1:-1, :-2] + g[1:-1, 2:]) / 4
        blocos = [(res[y:y + b, x:x + b].std(), g[y:y + b, x:x + b].std()) for y in range(0, h - b - 2, b) for x in range(0, w - b - 2, b)]
        blocos.sort(key=lambda t: t[1])
        ruido.append(np.mean([t[0] for t in blocos[:max(4, len(blocos) // 10)]]) * 255)
    return round(float(np.mean(cs)), 3), round(float(np.mean(ruido)), 2)


def fundo(imgs):
    """Cor do fundo provável, lida na moldura do quadro (os 6% de fora). Compara cantos e centro das bordas (degradê)."""
    bordas, cantos, meios = [], [], []
    for a in imgs:
        h, w, _ = a.shape
        k = max(3, int(h * 0.06))
        bordas.append(np.concatenate([a[:k].reshape(-1, 3), a[-k:].reshape(-1, 3), a[:, :k].reshape(-1, 3), a[:, -k:].reshape(-1, 3)]))
        cantos.append(np.concatenate([a[:k, :k].reshape(-1, 3), a[:k, -k:].reshape(-1, 3), a[-k:, :k].reshape(-1, 3), a[-k:, -k:].reshape(-1, 3)]))
        meios.append(np.concatenate([a[:k, w // 2 - k:w // 2 + k].reshape(-1, 3), a[-k:, w // 2 - k:w // 2 + k].reshape(-1, 3)]))
    b = np.concatenate(bordas)
    return {"borda": hexa(np.median(b, 0)), "cantos": hexa(np.median(np.concatenate(cantos), 0)), "meio_das_bordas": hexa(np.median(np.concatenate(meios), 0)),
            "uniformidade": round(float(1 - min(1.0, luminancia(b).std() * 4)), 2)}


def regua(caminho, saida, passo=100):
    """Quadro com régua de pixels: para ler coordenadas de pontos (cantos de um piso, pé de um objeto, ponta de uma sombra)."""
    im = Image.open(caminho).convert("RGB")
    d = ImageDraw.Draw(im, "RGBA")
    f = _fonte(13)
    for x in range(0, im.width, passo):
        d.line((x, 0, x, im.height), fill=(255, 255, 0, 70 if x % (passo * 2) else 120))
        d.text((x + 3, 3), str(x), fill=(255, 255, 0, 255), font=f)
    for y in range(0, im.height, passo):
        d.line((0, y, im.width, y), fill=(0, 255, 255, 70 if y % (passo * 2) else 120))
        d.text((3, y + 3), str(y), fill=(0, 255, 255, 255), font=f)
    im.save(saida, quality=92)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("origem", help="arquivo de vídeo ou link")
    ap.add_argument("--destino", default="pericia")
    ap.add_argument("--largura", type=int, default=1280, help="largura dos quadros extraídos (as coordenadas de pixel valem nessa largura)")
    a = ap.parse_args()

    dest = Path(a.destino)
    if a.origem.lower().endswith(IMAGENS) and not a.origem.startswith("http"):
        if not Path(a.origem).expanduser().exists():
            sys.exit("erro: arquivo não encontrado: %s" % a.origem)
        pericia_de_imagem(a.origem, dest, a.largura)
        return
    video = obter(a.origem, dest)
    info = sonda(video)
    fps_q = info["fps"] if info["quadros"] <= 2400 else 12.0      # filmes longos: 12 qps bastam para ler
    qd = dest / "quadros"
    quadros, fps = extrair(video, qd / "todos", a.largura, fps_q)
    n = len(quadros)
    Wq, Hq = Image.open(quadros[0]).size
    print("vídeo: %.2f s · %d×%d · %.2f qps · %d quadros extraídos a %d px de largura%s" % (info["duracao"], info["largura"], info["altura"], info["fps"], n, Wq, " · com áudio" if info["audio"] else " · sem áudio"))

    # ---- movimento
    e, er = energia(quadros)
    sig = assinatura(e, fps)
    lim = [0.0] + sig["cortes"] + [n / fps]
    planos = [{"n": i + 1, "t0": round(lim[i], 3), "t1": round(lim[i + 1], 3)} for i in range(len(lim) - 1)]
    idx = lambda t: min(n - 1, max(0, int(round(t * fps))))
    passo_cam = max(1, int(round(fps / 12)))

    amostra = lambda t0, t1, cada=0.25, tam=(320, 180): [abrir(quadros[idx(t)], tam) for t in np.arange(t0 + 1e-3, max(t1 - 1e-3, t0 + 2e-3), cada)] or [abrir(quadros[idx(t0)], tam)]
    for p in planos:
        i0, i1 = idx(p["t0"]), idx(p["t1"] - 1 / fps)
        p["camera"] = camera_do_plano(quadros[i0:i1 + 1], fps, passo_cam)
        seg = e[i0:max(i0 + 1, i1)]
        p["energia_media"] = round(float(seg.mean()), 3) if len(seg) else 0.0
        im = amostra(p["t0"], p["t1"])
        p["cor"] = estat_cor(im)
        p["paleta"] = paleta(im, k=6)
        p["fundo"] = fundo(im)
        p["nitidez"] = nitidez_por_faixa(amostra(p["t0"], p["t1"], 0.5, (640, 360)))
        meio = idx((p["t0"] + p["t1"]) / 2)
        p["quadro_chave_origem"] = {"quadro": quadros[meio].name, "t": round(meio / fps, 2)}
        p["quadro_chave"] = "quadros/chave-%02d.jpg" % p["n"]
        shutil.copyfile(quadros[meio], dest / p["quadro_chave"])
        regua(quadros[meio], dest / ("quadros/regua-%02d.jpg" % p["n"]))

    # plano único: quadros-chave extras nos trechos calmos, que é onde a imagem está mais legível
    extras = []
    if len(planos) == 1:
        perf = np.array(sig["perfil"])
        ordem = [int(i) for i in np.argsort(perf)]
        escolhidos = []
        for i in ordem:
            if all(abs(i - j) >= max(2, len(perf) // 6) for j in escolhidos):
                escolhidos.append(i)
            if len(escolhidos) >= 5:
                break
        for k, i in enumerate(sorted(escolhidos)):
            t = (i + 0.5) * sig["balde_s"]
            nome = "quadros/calmo-%02d-%05.2fs.jpg" % (k + 1, t)
            shutil.copyfile(quadros[idx(t)], dest / nome)
            extras.append({"t": round(t, 2), "arquivo": nome})

    geral_img = amostra(0, n / fps, max(0.25, (n / fps) / 60))
    vin, ruido = vinheta_e_ruido(amostra(0, n / fps, max(0.5, (n / fps) / 30), (640, 360)))
    medias_reg = er.mean(0)
    geral = {"cor": estat_cor(geral_img), "paleta": paleta(geral_img, k=8), "fundo": fundo(geral_img), "vinheta_cantos_sobre_centro": vin, "ruido_fino": ruido,
             "nitidez": nitidez_por_faixa(amostra(0, n / fps, max(0.5, (n / fps) / 30), (640, 360))),
             "energia_por_regiao": {r: round(float(v), 3) for r, v in zip(REGIOES, medias_reg)}}

    # ---- folhas
    itens1 = [(quadros[idx(t)], "%.0fs" % t) for t in np.arange(0, n / fps, 1.0)]
    folha(itens1, qd / "folha-1fps.jpg", colunas=min(6, max(3, len(itens1))), largura_celula=400)
    itens4 = [(quadros[idx(t)], "%.2fs q%d" % (t, idx(t))) for t in np.arange(0, n / fps, 0.25)]
    folhas4 = []
    for k in range(0, len(itens4), 48):
        nome = qd / ("folha-4fps-%02d.jpg" % (k // 48 + 1))
        folha(itens4[k:k + 48], nome, colunas=8, largura_celula=320)
        folhas4.append(str(nome.relative_to(dest)))

    # energia quadro a quadro (para contar a física em quadros) e a anatomia de cada pico
    with open(dest / "energia.csv", "w") as f:
        f.write("quadro,t,energia\n")
        for i, v in enumerate(e):
            f.write("%d,%.3f,%.3f\n" % (i + 2, (i + 1) / fps, v))
    nb = max(1, int(round(sig["balde_s"] * fps)))
    anat = []
    for k, tp in enumerate(sig["picos"][:6]):
        i0 = int(round(tp * fps))
        ate = i0 + nb
        while ate < len(e) and e[ate:ate + nb].mean() > 0.6 * sig["pico"]:      # pico em platô: vai até o fim dele
            ate += nb
        seg = e[i0:min(len(e), ate)]
        if not len(seg):
            continue
        ip = i0 + int(seg.argmax())
        piso = 0.2 * float(e[ip])
        a0 = ip
        while a0 > 0 and e[a0 - 1] > piso:
            a0 -= 1
        a1 = ip
        while a1 < len(e) - 1 and e[a1 + 1] > piso:
            a1 += 1
        de, fim = max(0, ip - 10), min(n - 1, ip + 26)
        nome = "quadros/pico-%02d-%05.2fs.jpg" % (k + 1, (ip + 1) / fps)
        folha([(quadros[q], "q%d %.2fs" % (q + 1, q / fps)) for q in range(de, fim + 1)], dest / nome, colunas=9, largura_celula=280)
        anat.append({"t": round((ip + 1) / fps, 2), "quadro": ip + 2, "energia": round(float(e[ip]), 2), "ataque_quadros": ip - a0, "assenta_quadros": a1 - ip,
                     "corte": bool(any(abs(c - (ip + 1) / fps) < 1.5 / fps for c in sig["cortes"])), "folha": nome})

    medido = {"ficha": info, "quadros": {"pasta": "quadros/todos", "n": n, "fps": fps, "largura": Wq, "altura": Hq}, "picos_quadro_a_quadro": anat,
              "movimento": sig, "planos": planos, "geral": geral, "quadros_calmos": extras}
    (dest / "medido.json").write_text(json.dumps(medido, ensure_ascii=False, indent=1))

    # ---- MEDIDO.md
    L = []
    L.append("# Medido na referência\n")
    L.append("*Gerado por `pericia.py`. São números do arquivo, não interpretação. O vídeo é de terceiro: fica em `ref/` e não vai para o código nem para o acervo.*\n")
    L.append("## Ficha\n")
    L.append("- %.2f s · %d×%d · %.2f quadros por segundo · %d quadros · %s" % (info["duracao"], info["largura"], info["altura"], info["fps"], info["quadros"], "com áudio" if info["audio"] else "sem áudio (todo o ritmo está na imagem)"))
    L.append("- Quadros extraídos: `quadros/todos/q00001.jpg` em diante, %d×%d, %.2f qps. **As coordenadas de pixel de `camera.py` e `sonda.py` valem nesse tamanho.**\n" % (Wq, Hq, fps))
    L.append("## Movimento\n")
    L.append("| Medida | Valor | Como ler |\n|---|---|---|")
    L.append("| Amplitude (pico ÷ mediana) | **%s×** | acima de ~12× o filme soca; abaixo de ~3× é contínuo |" % sig["amplitude"])
    L.append("| Quase-parada | **%d%%** do tempo | acima de 50%% segura muito; 0%% nunca para (laço, time-lapse, órbita) |" % round(sig["quase_parada"] * 100))
    L.append("| Picos | **%d** em %s | o maior aos %.1f s; os cortes secos contam como pico |" % (sig["n_picos"], ", ".join("%.1fs" % t for t in sig["picos"]) or "nenhum", sig["t_pico"]))
    L.append("| Cortes secos | **%d**%s | maior salto entre dois quadros: %.1f |" % (len(sig["cortes"]), (" em " + ", ".join("%.2fs" % t for t in sig["cortes"])) if sig["cortes"] else "", sig["maior_salto"]))
    L.append("| Energia média / mediana | %.2f / %.2f | só compare com números desta mesma ferramenta (a régua antiga `pericia-movimento.py` dá outra escala) |\n" % (sig["media"], sig["mediana"]))
    L.append("Perfil (um traço por 0,5 s):\n\n```")
    for i, v in enumerate(sig["perfil"]):
        L.append("%5.1fs %6.2f %s" % (i * sig["balde_s"], v, barra(v, sig["pico"])))
    L.append("```\n")
    if anat:
        L.append("Os picos, quadro a quadro (a física se conta aqui; a curva inteira está em `energia.csv`):\n")
        L.append("| Pico | Quadro | Sobe em | Assenta em | É corte? | Quadros consecutivos |\n|---|---|---|---|---|---|")
        for x in anat:
            L.append("| %.2f s | q%d | %d quadro(s) = %d ms | %d quadro(s) = %d ms | %s | `%s` |" % (x["t"], x["quadro"], x["ataque_quadros"], round(x["ataque_quadros"] / fps * 1000), x["assenta_quadros"], round(x["assenta_quadros"] / fps * 1000), "sim" if x["corte"] else "não", x["folha"]))
        L.append("\n\"Sobe em\" e \"assenta em\" contam os quadros em que a energia fica acima de 20% do pico, antes e depois dele: é o tamanho do soco. Abra a folha de cada pico para ver O QUE se move.\n")
    L.append("Energia por região do quadro (onde o movimento mora):\n\n```")
    m = max(medias_reg.max(), 1e-6)
    for j in range(3):
        L.append("  ".join("%-9s %5.2f %-8s" % (REGIOES[j * 3 + i], medias_reg[j * 3 + i], barra(medias_reg[j * 3 + i], m, 8)) for i in range(3)))
    L.append("```\n")
    L.append("## Planos e câmera\n")
    L.append("| # | Janela | Câmera (medida) | Energia | Fundo | Lum. p5 / p50 / p95 | R:G:B | Sat. | Foco |\n|---|---|---|---|---|---|---|---|---|")
    for p in planos:
        c = p["cor"]
        L.append("| %d | %.2f–%.2f s | %s%s | %.2f | `%s` | %.2f / %.2f / %.2f | 1 : %.2f : %.2f | %.2f | %s |" % (
            p["n"], p["t0"], p["t1"], p["camera"]["tipo"], " (confiança baixa)" if p["camera"]["confianca_baixa"] else "", p["energia_media"], p["fundo"]["borda"],
            c["lum"]["p5"], c["lum"]["p50"], c["lum"]["p95"], c["razao_rgb"][1], c["razao_rgb"][2], c["saturacao"], p["nitidez"]["leitura"].split(":")[0].split("(")[0].strip().replace("não dá para dizer", "sem leitura").replace("talvez foco raso", "talvez raso")))
    L.append("\nA câmera é medida por deslocamento global da imagem: distingue parada, deslize e aproximação. É um indício, não um fato: uma órbita em volta do objeto aparece como deslize, e um plano em que a cena se monta ou muitos objetos entram pode acusar um deslize que não existe. Confirme no olho comparando o fundo em dois quadros distantes do mesmo plano. Lente, altura e ângulo saem de `camera.py`.\n")
    L.append("## Cor (filme inteiro, em espaço de exibição)\n")
    g = geral["cor"]
    L.append("- Luminância: p1 %.3f · p5 %.3f · p25 %.3f · **p50 %.3f** · p75 %.3f · p95 %.3f · p99 %.3f" % tuple(g["lum"][k] for k in ("p1", "p5", "p25", "p50", "p75", "p95", "p99")))
    L.append("- Razão R : G : B = 1 : %.2f : %.2f · saturação média %.2f" % (g["razao_rgb"][1], g["razao_rgb"][2], g["saturacao"]))
    L.append("- Fundo provável: borda `%s`, cantos `%s`, meio das bordas `%s` (uniformidade %.2f; cantos mais escuros que o meio = degradê ou vinheta)" % (geral["fundo"]["borda"], geral["fundo"]["cantos"], geral["fundo"]["meio_das_bordas"], geral["fundo"]["uniformidade"]))
    L.append("\nPaleta dominante (agrupada em espaço perceptual). **Fatia não é papel:** o acento costuma ser a menor fatia e a cor mais saturada (croma alto).\n")
    L.append("| Cor | Fatia | Luminância | Croma |\n|---|---|---|---|")
    for c in geral["paleta"]:
        L.append("| `%s` | %d%% | %.2f | %.2f |" % (c["hex"], round(c["fatia"] * 100), c["lum"], c["croma"]))
    L.append("\n## Lente e acabamento\n")
    L.append("- Nitidez por faixa, do topo à base (1 = a mais nítida): %s → **%s**" % (" · ".join("%.2f" % v if v is not None else "vazia" for v in geral["nitidez"]["faixas_topo_a_base"]), geral["nitidez"]["leitura"]))
    L.append("- Cantos ÷ centro em luminância: %.2f (abaixo de ~0,85 com fundo liso = vinheta; com fundo em degradê, é o próprio fundo)" % vin)
    L.append("- Ruído fino nas áreas lisas: %.2f níveis (abaixo de ~0,6 = limpo; 1 a 2 = grão leve; acima de 2 = grão forte ou compressão: confira num quadro ampliado)\n" % ruido)
    L.append("## Arquivos para ler\n")
    L.append("- `quadros/folha-1fps.jpg` (visão geral) · %s (momentos; 1 quadro = 250 ms)" % ", ".join("`%s`" % f for f in folhas4))
    L.append("- %s" % " · ".join("`%s` + `quadros/regua-%02d.jpg` (é o `%s`, %.2f s)" % (p["quadro_chave"], p["n"], p["quadro_chave_origem"]["quadro"], p["quadro_chave_origem"]["t"]) for p in planos))
    if extras:
        L.append("- Trechos calmos (imagem mais legível): %s" % ", ".join("`%s`" % x["arquivo"] for x in extras))
    L.append("\n## O que este arquivo NÃO mediu (leia e meça antes de construir)\n")
    L.append("Tudo o que ficar em adjetivo vira retrabalho. Siga `references/pericia-3d.md` e transforme cada item em número:\n")
    L.append("- [ ] **Mecanismo** em uma frase e os momentos com janela de tempo (folha de 4 qps).")
    L.append("- [ ] **Câmera:** ortográfica ou perspectiva, lente, altura e ângulo: marque 5 ou mais pontos na régua e rode `camera.py resolver`.")
    L.append("- [ ] **Luz:** direção (pela sombra), razão claro ÷ sombra no herói, densidade e largura da penumbra no chão: `sonda.py`.")
    L.append("- [ ] **Materiais:** largura e cor do brilho, o que reflete o quê.")
    L.append("- [ ] **Proporções:** quanto do quadro o herói ocupa; tamanho dos elementos em relação a ele; escala das texturas.")
    L.append("- [ ] **Como o herói se destaca** e a **área do elemento do soco** (em % do quadro).")
    L.append("- [ ] **Física** dos movimentos principais, contada em quadros (quanto anda, em quantos quadros, passa do ponto?).")
    L.append("- [ ] **O que o filme nunca faz** (cinco itens ou mais).")
    (dest / "MEDIDO.md").write_text("\n".join(L) + "\n")
    print("pronto: %s/MEDIDO.md · %d plano(s) · amplitude %s× · quase-parada %d%% · %d pico(s)" % (dest, len(planos), sig["amplitude"], round(sig["quase_parada"] * 100), sig["n_picos"]))


if __name__ == "__main__":
    main()
