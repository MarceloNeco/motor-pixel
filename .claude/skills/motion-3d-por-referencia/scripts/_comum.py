"""Funções compartilhadas pelas ferramentas da skill: quadros, energia de movimento, cor e folhas de quadros.

Tudo é medido nos pixels decodificados (numpy), do mesmo jeito para a referência e para o nosso filme. Uma medida só
vale como comparação quando os dois lados passaram pela mesma régua.
"""
import _utf8  # noqa: F401
import json
import shutil
import subprocess
import sys
from pathlib import Path

try:
    import numpy as np
    from PIL import Image, ImageDraw, ImageFont
except ImportError:  # pragma: no cover
    sys.exit("erro: faltam numpy e Pillow. Instale com: python3 -m pip install numpy pillow   (no Windows: python -m pip install numpy pillow)")

BALDE = 0.5          # segundos por balde do perfil de energia
LUMA = (0.2126, 0.7152, 0.0722)


def precisa(*ferramentas):
    for f in ferramentas:
        if not shutil.which(f):
            pacote = "ffmpeg" if f.startswith("ff") else f
            sys.exit("erro: '%s' não encontrado. Instale antes de continuar (Mac: brew install %s · Windows: winget install %s)." % (f, pacote, {"ffmpeg": "Gyan.FFmpeg", "yt-dlp": "yt-dlp.yt-dlp"}.get(pacote, pacote)))


def sonda(video):
    """Duração, fps, tamanho, número de quadros e se tem áudio."""
    precisa("ffprobe")
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate,nb_frames",
                          "-show_entries", "format=duration", "-of", "json", str(video)], capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    v = next(s for s in d["streams"] if s.get("codec_type") == "video")
    num, den = v["r_frame_rate"].split("/")
    fps = float(num) / float(den)
    dur = float(d["format"]["duration"])
    return {"duracao": round(dur, 3), "fps": round(fps, 3), "largura": v["width"], "altura": v["height"],
            "quadros": int(v["nb_frames"]) if str(v.get("nb_frames", "")).isdigit() else int(round(dur * fps)),
            "audio": any(s.get("codec_type") == "audio" for s in d["streams"])}


def extrair(video, destino, largura=1280, fps=None, prefixo="q"):
    """Extrai os quadros para destino/ (JPEG, largura fixa). Reaproveita se o vídeo não mudou. Devolve (lista, fps)."""
    precisa("ffmpeg")
    video, destino = Path(video), Path(destino)
    info = sonda(video)
    fps = float(fps or info["fps"])
    marca = destino / ".origem.json"
    assinatura = {"arquivo": str(video.resolve()), "tamanho": video.stat().st_size, "mtime": int(video.stat().st_mtime), "largura": largura, "fps": fps}
    if marca.exists() and json.loads(marca.read_text()) == assinatura:
        return sorted(destino.glob(prefixo + "*.jpg")), fps
    if destino.exists():
        shutil.rmtree(destino)
    destino.mkdir(parents=True)
    vf = "scale=%d:-2:flags=lanczos" % largura
    if abs(fps - info["fps"]) > 0.01:
        vf = "fps=%s," % fps + vf
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", vf, "-q:v", "3", str(destino / (prefixo + "%05d.jpg"))], check=True)
    marca.write_text(json.dumps(assinatura))
    return sorted(destino.glob(prefixo + "*.jpg")), fps


def abrir(caminho, tam=None):
    im = Image.open(caminho).convert("RGB")
    if tam:
        im = im.resize(tam, Image.BILINEAR)
    return np.asarray(im, dtype=np.float32) / 255.0


def luminancia(rgb):
    rgb = np.asarray(rgb)   # soma explícita: o produto matricial em float32 solta avisos falsos em alguns Macs
    return rgb[..., 0] * LUMA[0] + rgb[..., 1] * LUMA[1] + rgb[..., 2] * LUMA[2]


# ------------------------------------------------------------------ movimento

REGIOES = ["topo-esq", "topo", "topo-dir", "meio-esq", "centro", "meio-dir", "base-esq", "base", "base-dir"]


def energia(quadros, tam=(192, 108)):
    """Energia de movimento: diferença média de luminância (0 a 255) entre quadros vizinhos.
    Devolve (total[n-1], por_regiao[n-1, 9]) com a grade 3×3 de REGIOES."""
    ant, tot, reg = None, [], []
    w, h = tam
    for q in quadros:
        x = luminancia(abrir(q, tam)) * 255.0
        if ant is not None:
            d = np.abs(x - ant)
            tot.append(float(d.mean()))
            reg.append([float(d[j * h // 3:(j + 1) * h // 3, i * w // 3:(i + 1) * w // 3].mean()) for j in range(3) for i in range(3)])
        ant = x
    return np.array(tot), np.array(reg).reshape(-1, 9)


def cortes(e, fps):
    """Cortes secos: um único quadro com salto grande, cercado de quadros calmos. Uma onda de cor que cobre o quadro
    em vários quadros seguidos NÃO é corte (era o falso positivo da régua antiga)."""
    out = []
    for i in range(len(e)):
        viz = [e[j] for j in (i - 2, i - 1, i + 1, i + 2) if 0 <= j < len(e)]
        if e[i] > 18 and viz and e[i] > 3.5 * max(max(viz), 0.6):
            out.append(round((i + 1) / fps, 3))
    return out


def assinatura(e, fps, ignorar_cortes=False):
    """A assinatura de movimento de um filme: perfil em baldes de 0,5 s, amplitude (pico ÷ mediana), fração em
    quase-parada (baldes abaixo de 10% do pico) e picos (grupos de baldes acima de 60% do pico).
    O corte seco entra no perfil: num filme de pausa e estalo ele é um dos estalos. O salto de cada corte é limitado
    ao dobro do maior movimento real, para um corte entre duas imagens muito diferentes não esconder os socos."""
    e = np.asarray(e, dtype=float)
    cs = cortes(e, fps)
    x = e.copy()
    idx = [int(round(c * fps)) - 1 for c in cs]
    idx = [i for i in idx if 0 <= i < len(x)]
    if idx:
        resto = np.delete(x, idx)
        teto = 2.0 * float(resto.max()) if len(resto) else float(x.max())
        for i in idx:
            x[i] = np.median(x[max(0, i - 3):i + 4]) if ignorar_cortes else min(x[i], teto)
    n = max(1, int(round(BALDE * fps)))
    perfil = [float(x[i:i + n].mean()) for i in range(0, len(x), n) if len(x[i:i + n]) >= max(1, n // 2)]
    p = np.array(perfil)
    pico, med = float(p.max()), float(np.median(p))
    acima = p > 0.6 * pico
    picos = [round(i * BALDE, 2) for i in range(len(p)) if acima[i] and (i == 0 or not acima[i - 1])]
    return {
        "perfil": [round(v, 3) for v in perfil], "balde_s": BALDE,
        "media": round(float(p.mean()), 3), "mediana": round(med, 3), "pico": round(pico, 3),
        "amplitude": round(pico / med, 2) if med > 1e-6 else None,
        "quase_parada": round(float((p < 0.1 * pico).mean()), 3),
        "picos": picos, "n_picos": len(picos), "t_pico": round(float(p.argmax()) * BALDE, 2),
        "cortes": cs, "maior_salto": round(float(e.max()), 2),
    }


# ------------------------------------------------------------------ cor

def estat_cor(imgs):
    """Estatística de cor em espaço de exibição (sRGB como está no arquivo): é onde se casa a gradação."""
    a = np.stack(imgs).reshape(-1, 3)
    lum = luminancia(a)
    mx, mn = a.max(-1), a.min(-1)
    sat = np.where(mx > 0.05, (mx - mn) / np.maximum(mx, 1e-3), 0)
    m = a.mean(0)
    return {
        "media_rgb": [round(float(v), 3) for v in m],
        "razao_rgb": [1.0, round(float(m[1] / max(m[0], 1e-4)), 3), round(float(m[2] / max(m[0], 1e-4)), 3)],
        "lum": {("p%d" % k): round(float(v), 3) for k, v in zip((1, 5, 25, 50, 75, 95, 99), np.percentile(lum, [1, 5, 25, 50, 75, 95, 99]))},
        "saturacao": round(float(sat.mean()), 3),
    }


def _lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def oklab(rgb):
    """sRGB (0..1) → OKLab. Distância aqui acompanha a diferença que o olho vê (em sRGB, não)."""
    r = _lin(np.asarray(rgb, dtype=np.float64))
    l = 0.4122214708 * r[..., 0] + 0.5363325363 * r[..., 1] + 0.0514459929 * r[..., 2]
    m = 0.2119034982 * r[..., 0] + 0.6806995451 * r[..., 1] + 0.1073969566 * r[..., 2]
    s = 0.0883024619 * r[..., 0] + 0.2817188376 * r[..., 1] + 0.6299787005 * r[..., 2]
    l, m, s = np.cbrt(l), np.cbrt(m), np.cbrt(s)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                     1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], -1)


def hexa(rgb):
    return "#%02x%02x%02x" % tuple(int(round(max(0.0, min(1.0, float(v))) * 255)) for v in rgb)


def de_hexa(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]


def paleta(imgs, k=7, semente=7):
    """Cores dominantes por k-médias em OKLab. Devolve [{hex, fatia, lum, croma}] da maior fatia para a menor."""
    a = np.stack(imgs).reshape(-1, 3)
    rng = np.random.default_rng(semente)
    if len(a) > 60000:
        a = a[rng.choice(len(a), 60000, replace=False)]
    lab = oklab(a)
    cent = lab[rng.choice(len(lab), k, replace=False)]
    for _ in range(25):
        d = ((lab[:, None, :] - cent[None]) ** 2).sum(-1)
        g = d.argmin(1)
        novo = np.array([lab[g == i].mean(0) if (g == i).any() else cent[i] for i in range(k)])
        if np.allclose(novo, cent, atol=1e-5):
            break
        cent = novo
    out = []
    for i in range(k):
        if not (g == i).any():
            continue
        cor = np.median(a[g == i], 0)
        out.append({"hex": hexa(cor), "fatia": round(float((g == i).mean()), 3), "lum": round(float(luminancia(cor)), 3),
                    "croma": round(float(np.hypot(cent[i][1], cent[i][2])), 3)})
    return sorted(out, key=lambda c: -c["fatia"])


def delta_e(h1, h2):
    """Diferença perceptual entre duas cores hex (OKLab × 100). Abaixo de ~2 é igual a olho; acima de ~8 é outra cor."""
    return round(float(np.linalg.norm(oklab(np.array(de_hexa(h1))) - oklab(np.array(de_hexa(h2)))) * 100), 1)


# ------------------------------------------------------------------ folhas de quadros

def _fonte(tam):
    for nome in ("/System/Library/Fonts/Helvetica.ttc", "/System/Library/Fonts/Supplemental/Arial.ttf", "C:/Windows/Fonts/arial.ttf",
                 "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(nome, tam)
        except Exception:
            pass
    return ImageFont.load_default()


def etiqueta(im, txt, pos=(6, 4), tam=15):
    d = ImageDraw.Draw(im)
    f = _fonte(tam)
    x, y = pos
    box = d.textbbox((x, y), txt, font=f)
    d.rectangle((box[0] - 4, box[1] - 2, box[2] + 4, box[3] + 3), fill=(0, 0, 0))
    d.text((x, y), txt, fill=(255, 235, 60), font=f)
    return im


def folha(itens, saida, colunas=6, largura_celula=320, titulo=None):
    """itens = [(caminho, rótulo)]. Monta uma folha de contato com o rótulo em cada quadro."""
    if not itens:
        return None
    primeira = Image.open(itens[0][0])
    tw = largura_celula
    th = int(round(primeira.height * tw / primeira.width))
    colunas = min(colunas, len(itens))
    linhas = (len(itens) + colunas - 1) // colunas
    topo = 30 if titulo else 0
    W = Image.new("RGB", (colunas * tw, linhas * th + topo), (18, 18, 18))
    if titulo:
        ImageDraw.Draw(W).text((8, 6), titulo, fill=(240, 240, 240), font=_fonte(16))
    for i, (cam, rot) in enumerate(itens):
        im = Image.open(cam).convert("RGB").resize((tw, th), Image.LANCZOS)
        W.paste(etiqueta(im, rot, tam=max(11, tw // 22)), ((i % colunas) * tw, topo + (i // colunas) * th))
    Path(saida).parent.mkdir(parents=True, exist_ok=True)
    W.save(saida, quality=88)
    return saida


def barra(v, escala, largura=28, ch="#"):
    return ch * int(round(min(1.0, v / escala if escala else 0) * largura))
