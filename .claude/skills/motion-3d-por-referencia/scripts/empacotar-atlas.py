#!/usr/bin/env python3
"""Monta o Atlas que vai DENTRO da skill gratuita, a partir do acervo da skill gratuita.

    empacotar-atlas.py PASTA_DO_ACERVO [--destino <skill>/atlas]        (ou defina MOTION_ACERVO)

TRAVA: a pasta do acervo precisa ter um ACERVO.json com "skill": "gratuita". Qualquer outra pasta é recusada, para
que os motions de outro acervo (os que são só dos alunos) nunca entrem na skill gratuita por engano.

Para cada motion do acervo (pasta NN-nome com ficha.json) copia a ficha, o método, o prompt, a perícia e o código, e
gera uma capa leve e uma prévia leve do vídeo (540 px). O vídeo original e os cards não vão: o acervo pesa centenas
de MB e o Atlas da skill precisa caber num download. No fim escreve `atlas/index.html`, a galeria que o comando
/referencia abre: cada motion com a prévia, a descrição e um botão que copia o pedido pronto para colar no Claude.

Rode de novo sempre que um motion for aprovado ou alterado no acervo. Não entram: node_modules, vídeos de referência
de terceiros, nem nada fora das pastas NN-nome.
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import argparse
import html
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _comum import Image, precisa

TEXTO = {".js", ".mjs", ".json", ".html", ".css", ".py", ".svg", ".txt", ".md", ".woff2", ".ttf", ".otf"}

PAGINA = """<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Atlas de motions 3D</title>
<style>
:root { --papel:#f6f5f4; --tinta:#111; --azul:#0075de; --mar:#f5b82e; --linha:#e3e1de; --cinza:#6b6966; }
* { box-sizing:border-box; }
body { margin:0; background:var(--papel); color:var(--tinta); font:15px/1.5 Inter, -apple-system, "Helvetica Neue", Arial, sans-serif; }
header { position:sticky; top:0; z-index:5; background:rgba(246,245,244,.94); backdrop-filter:blur(8px); border-bottom:1px solid var(--linha); }
.topo { max-width:1320px; margin:0 auto; padding:16px 28px; display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
h1 { font-size:24px; font-weight:800; letter-spacing:-.02em; margin:0; }
h1 mark { background:var(--mar); padding:0 .15em; }
.tema { flex:1; min-width:280px; display:flex; gap:10px; align-items:center; }
.tema label { font-size:12px; color:var(--cinza); white-space:nowrap; }
.tema input { flex:1; font:inherit; padding:9px 12px; border:1px solid var(--linha); border-radius:10px; background:#fff; }
.tema input:focus { outline:2px solid var(--azul); outline-offset:1px; }
main { max-width:1320px; margin:0 auto; padding:22px 28px 90px; }
.sub { color:var(--cinza); max-width:860px; margin:0 0 22px; }
.grade { display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:20px; }
.card { background:#fff; border:1px solid var(--linha); border-radius:14px; overflow:hidden; display:flex; flex-direction:column; }
.midia { position:relative; background:#111; aspect-ratio:16/9; cursor:pointer; }
.midia video, .midia img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
.midia .n { position:absolute; left:10px; top:10px; z-index:2; font-weight:800; font-size:12px; color:#fff; background:rgba(0,0,0,.6); border-radius:999px; padding:2px 9px; font-variant-numeric:tabular-nums; }
.midia .toca { position:absolute; right:10px; bottom:10px; z-index:2; font-size:11px; color:#fff; background:rgba(0,0,0,.6); border-radius:999px; padding:2px 9px; }
.t { padding:13px 16px 16px; display:flex; flex-direction:column; gap:6px; flex:1; }
.t h2 { font-size:18px; font-weight:800; letter-spacing:-.01em; margin:0; }
.t .est { color:var(--azul); font-weight:600; font-size:13px; }
.t .meta { font-size:12px; color:var(--cinza); }
.t p { margin:0; font-size:13.5px; }
.t p.bom { color:var(--cinza); }
.t button { margin-top:auto; font:inherit; font-weight:700; color:#fff; background:var(--azul); border:0; border-radius:10px; padding:10px 14px; cursor:pointer; }
.t button:hover { filter:brightness(1.08); }
#aviso { position:fixed; left:50%; bottom:26px; transform:translateX(-50%) translateY(20px); background:#111; color:#fff; padding:12px 18px; border-radius:12px; font-size:14px; opacity:0; transition:.25s; pointer-events:none; max-width:min(92vw, 720px); }
#aviso.on { opacity:1; transform:translateX(-50%); }
#aviso code { color:var(--mar); }
</style></head><body>
<header><div class="topo">
  <h1>Atlas de <mark>motions 3D</mark></h1>
  <div class="tema"><label for="tema">Seu tema (opcional)</label><input id="tema" placeholder="ex.: o que tem dentro de uma garrafa térmica, 8 s, vertical"></div>
</div></header>
<main>
  <p class="sub">__N__ estilos feitos só com código (three.js). Todos rodam em laço; clique num vídeo para pausar. Escolha um, clique em <b>Usar este estilo</b> e cole no Claude: ele parte do código pronto daquele motion e troca o conteúdo pelo seu tema. Do exemplo ficam a técnica, a edição e o ritmo; tema, textos, duração e formato são seus.</p>
  <div class="grade" id="grade"></div>
</main>
<div id="aviso"></div>
<script>
const ITENS = __DADOS__;
const g = document.getElementById('grade'), aviso = document.getElementById('aviso'), tema = document.getElementById('tema');
tema.value = localStorage.getItem('atlas-tema') || ''; tema.oninput = () => localStorage.setItem('atlas-tema', tema.value);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
for (const it of ITENS) {
  const c = document.createElement('div'); c.className = 'card';
  c.innerHTML = `<div class="midia"><span class="n">${String(it.numero).padStart(2, '0')}</span>
    <video muted loop autoplay playsinline preload="metadata" poster="${it.pasta}/poster.jpg" src="${it.pasta}/previa.mp4"></video></div>
    <div class="t"><h2>${esc(it.nome)}</h2><div class="est">${esc(it.estilo)}</div>
    <div class="meta">${esc(it.tipo)} · ${esc(it.duracao_s)} s · ${esc((it.formato || '').split(',')[0])}</div>
    <p>${esc(it.descricao)}</p><p class="bom"><b>Bom para:</b> ${esc(it.bom_para)}</p>
    <button>Usar este estilo</button></div>`;
  const v = c.querySelector('video'), m = c.querySelector('.midia');
  v.muted = true;
  m.onclick = () => { v._parado = !v._parado; v._parado ? v.pause() : v.play().catch(() => {}); };
  c.querySelector('button').onclick = async () => {
    const t = tema.value.trim();
    const texto = `/motion-3d-por-referencia atlas:${String(it.numero).padStart(2, '0')} (${it.nome}). Meu tema: ${t || ''}`;
    try { await navigator.clipboard.writeText(texto); } catch { const a = document.createElement('textarea'); a.value = texto; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); }
    aviso.innerHTML = `Copiado. Cole no Claude${t ? '' : ' e complete com o seu tema'}: <code>${esc(texto)}</code>`; aviso.classList.add('on'); clearTimeout(aviso._t); aviso._t = setTimeout(() => aviso.classList.remove('on'), 5200);
  };
  g.appendChild(c);
}
// todos em laço: toca o que está na tela e pausa o que saiu dela (clique no vídeo pausa ou retoma aquele)
const videos = [...document.querySelectorAll('.midia video')];
const tocar = v => { if (!v._parado) v.play().catch(() => {}); };
if ('IntersectionObserver' in window) {
  const olho = new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? tocar(e.target) : e.target.pause())), { rootMargin: '200px' });
  videos.forEach(v => olho.observe(v));
} else videos.forEach(tocar);
document.addEventListener('visibilitychange', () => { if (!document.hidden) videos.forEach(v => { const r = v.getBoundingClientRect(); if (r.bottom > -200 && r.top < innerHeight + 200) tocar(v); }); });
</script></body></html>
"""


def limpar(arq):
    """O que vai para outras pessoas não leva caminho da máquina de quem fez (nome de usuário, pastas pessoais)."""
    if arq.suffix.lower() not in {".js", ".mjs", ".json", ".html", ".css", ".py", ".svg", ".txt", ".md"}:
        return
    try:
        t = arq.read_text(encoding="utf-8")
    except Exception:
        return
    n = re.sub(r"(/Users/|/home/|[A-Za-z]:\\\\Users\\\\)[^/\\\s\"']+", "~", t)
    n = re.sub(r"/private/tmp/claude-[^\s\"']+", "/tmp/...", n)
    if n != t:
        arq.write_text(n, encoding="utf-8")


def conferir_acervo(orig):
    """Só empacota o acervo da skill gratuita. Recusa antes de tocar em qualquer arquivo."""
    marca = orig / "ACERVO.json"
    try:
        dono = json.loads(marca.read_text(encoding="utf-8")).get("skill")
    except FileNotFoundError:
        dono = None
        motivo = "ela não tem ACERVO.json"
    except Exception as e:
        dono = None
        motivo = "o ACERVO.json dela não pôde ser lido (%s)" % e
    else:
        motivo = 'o ACERVO.json dela diz "skill": %s' % json.dumps(dono, ensure_ascii=False)
    if dono != "gratuita":
        sys.exit("RECUSADO: %s não é o acervo da skill gratuita (%s).\n"
                 'Este empacotador só aceita a pasta cujo ACERVO.json diz "skill": "gratuita" (motions-skill-gratuita/).\n'
                 "Nada foi alterado." % (orig, motivo))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("acervo", nargs="?", default=os.environ.get("MOTION_ACERVO"))
    ap.add_argument("--destino", default=str(Path(__file__).resolve().parent.parent / "atlas"))
    a = ap.parse_args()
    if not a.acervo:
        sys.exit("uso: empacotar-atlas.py PASTA_DO_ACERVO   (o acervo da skill gratuita: NN-nome/ficha.json e ACERVO.json)")
    orig, dest = Path(a.acervo).expanduser(), Path(a.destino).expanduser()
    conferir_acervo(orig)
    precisa("ffmpeg")
    pastas = sorted(p.parent for p in orig.glob("[0-9][0-9]-*/ficha.json"))
    if not pastas:
        sys.exit("erro: não achei motions (pastas NN-nome com ficha.json) em %s" % orig)
    if dest.exists():
        shutil.rmtree(dest)
    dest.mkdir(parents=True)
    itens = []
    for p in pastas:
        f = json.loads((p / "ficha.json").read_text(encoding="utf-8"))
        d = dest / p.name
        d.mkdir()
        for nome in ("ficha.json", "METODO.md", "PROMPT.md", "pericia-da-referencia.md", "copy.txt"):
            if (p / nome).exists():
                shutil.copyfile(p / nome, d / nome)
                limpar(d / nome)
        cod = p / "codigo"
        if cod.exists():
            for arq in cod.rglob("*"):
                if arq.is_file() and "node_modules" not in arq.parts and not arq.name.startswith(".") and arq.name != "package-lock.json" and arq.suffix.lower() in TEXTO:
                    alvo = d / "codigo" / arq.relative_to(cod)
                    alvo.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(arq, alvo)
                    limpar(alvo)
        video = p / f.get("video", "")
        poster = p / f.get("poster", "poster.jpg")
        if poster.exists():
            im = Image.open(poster).convert("RGB")
            k = min(1.0, 960 / max(im.size))
            im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS).save(d / "poster.jpg", quality=80)
        if video.exists() and video.is_file():
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf", "scale='if(gt(iw,ih),-2,540)':'if(gt(iw,ih),540,-2)'",
                            "-c:v", "libx264", "-crf", "30", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "64k", str(d / "previa.mp4")], check=True)
        peso = sum(x.stat().st_size for x in d.rglob("*") if x.is_file())
        itens.append({"numero": f.get("numero"), "pasta": p.name, "nome": f.get("nome"), "estilo": f.get("estilo"), "tipo": f.get("tipo"), "duracao_s": f.get("duracao_s"),
                      "formato": f.get("formato"), "descricao": f.get("descricao"), "bom_para": f.get("bom_para")})
        print("%s  %.1f MB%s" % (p.name, peso / 1e6, "" if (d / "previa.mp4").exists() else "  (sem vídeo)"))
    dados = json.dumps(itens, ensure_ascii=False).replace("</", "<\\/")
    (dest / "index.html").write_text(PAGINA.replace("__N__", str(len(itens))).replace("__DADOS__", dados), encoding="utf-8")
    (dest / "LEIA-ME.md").write_text("# Atlas da skill\n\nGerado por `scripts/empacotar-atlas.py` a partir do acervo de motions aprovados. Não edite à mão: rode o script de novo.\n"
                                     "Cada pasta traz a ficha, o método, o prompt, a perícia, o código (sem node_modules), uma capa e uma prévia leve do vídeo.\n", encoding="utf-8")
    total = sum(x.stat().st_size for x in dest.rglob("*") if x.is_file())
    print("\natlas: %d motions · %.1f MB · %s" % (len(itens), total / 1e6, dest))


if __name__ == "__main__":
    main()
