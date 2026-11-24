#!/usr/bin/env python3
"""Da planta da cena aos pedidos de trabalho de cada frente.

    frentes.py [planta.json]        na pasta do projeto

Lê `planta.json` (a lista de peças do filme, cada uma com nome, frente, tamanho, o recorte dela na referência e o que
não pode faltar) e gera:
    pericia/recortes/NOME.jpg       o pedaço da referência onde a peça aparece, ampliado (o banco mostra ao lado)
    frentes/BRIEF-FRENTE.md         o pedido completo para quem vai construir as peças daquela frente

Uma frente = um grupo de peças que uma pessoa (ou um subagente) constrói sozinha, isolada, no banco de peças,
enquanto as outras frentes e a cena avançam ao mesmo tempo. Foi assim que o resultado aprovado saiu: cada objeto
visto de perto, de quatro lados, antes de entrar na cena. Escrever esses pedidos à mão custa minutos e sai desigual;
por isso eles nascem da planta.
"""
import _utf8  # noqa: F401  (Windows: garante UTF-8 antes de qualquer leitura ou escrita)
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from _comum import Image

BRIEF = """# Frente "{frente}": {n} peça(s) do filme "{filme}"

Você vai construir {n} peça(s) 3D em three.js, só com código (sem modelos nem imagens de arquivo), cada uma num
arquivo próprio, revisando no banco de peças. Outras frentes trabalham ao mesmo tempo em outros arquivos e a cena já
está sendo montada com substitutos do tamanho de cada peça: **edite só os arquivos listados aqui** (nada de
`src/main.js`, `src/ds.js`, `src/luz.js` nem `src/lib/`).

Projeto: `{projeto}` (three 0.187). Responda em português do Brasil. Não use subagentes.

## O nível pedido
{acabamento}

Modo **{modo}**. {regra_modo}

## As peças
{pecas}

## Convenções (valem para todas)
- Arquivo `src/pecas/NOME.js` exportando por padrão `criar(opcoes)`, que devolve um `THREE.Object3D` ou, se a peça
  tem movimento próprio, `{{ grupo, pose(estado) }}` (`pose` recebe um número 0..1 para demonstrar, ou um objeto com os
  campos pedidos; campo ausente = neutro; função pura do que recebe).
- Base da peça em y = 0, centro em x = z = 0, frente para +z, **na escala do filme** ({escala}), cabendo na caixa
  de tamanho indicada (largura × altura × profundidade).
- Importe de `three`, dos addons em `three/addons/...` e de `../lib/formas.js` (`caixaMacia`, `naCaixaMacia`, `rb`, `cyl`,
  `sph`, `cap`, `torno([[raio, altura], ...] de baixo para cima)`, `extrusao`, `tubo`, `canvasTex`, `granulado`,
  `M(cor, {{ r, m, verniz, bump, rep, bs, e, ei }})`, `muitos`, `sh`). Cores: importe `DS` de `../ds.js` quando a
  cor for um token do filme.
- Não defina `envMap` nos materiais (o ambiente vem da cena). Sem `Math.random`, relógio ou estado acumulado.
- Torno com perfil de cima para baixo fica do avesso. Peça que vai ser vista de mais de um lado precisa estar acabada
  de todos os lados. Malha suficiente para a silhueta sair lisa.

## Como revisar: o banco de peças
```bash
cd "{projeto}"
node render.mjs peca NOME --q=rascunho --luz=filme --ref=pericia/recortes/NOME.jpg     # rápido → out/pecas/NOME.jpg
node render.mjs peca NOME --luz=filme --ref=pericia/recortes/NOME.jpg                   # final
node render.mjs peca NOME --t=0.4                                                        # um instante da demonstração
```
A folha mostra a peça em quatro vistas, sob a luz do filme, com o recorte da referência no canto. Abra a imagem a
cada rodada e responda com dureza: lê de primeira como o objeto certo, olhando a imagem pequena? o brilho é o do
material pedido? alguma peça atravessa outra, há fresta, serrilhado, face do avesso? as quatro vistas estão
acabadas? Leia os avisos `[página]` no terminal.

## Orçamento
Até **5 rodadas no banco por peça**. Pare quando a peça ler de primeira e não tiver defeito da lista acima: melhor
entregar boa e no prazo do que perseguir o último detalhe. Se uma peça não fechar em 5 rodadas, entregue como está e
diga o que falta.

## Relatório final (curto)
Para cada peça: o caminho do arquivo e da folha; a assinatura de `criar()` e de `pose()`, as constantes exportadas
(medidas, pontos de encaixe ou de pega) e as opções aceitas; o que ainda está abaixo da referência, dito com
franqueza.
"""

PECA = """### `src/pecas/{nome}.js`: {o_que_e}
- **Caixa:** {tam} (largura × altura × profundidade).
- **Material:** {material}
- **Não pode faltar:** {nao_pode_faltar}{mov}{ref}
"""


def main():
    arq = Path(sys.argv[1] if len(sys.argv) > 1 else "planta.json").resolve()
    if not arq.exists():
        sys.exit("erro: não achei %s (rode na pasta do projeto)" % arq)
    raiz = arq.parent
    bruto = arq.read_text(encoding="utf-8")
    if "TROCAR" in bruto:
        sys.exit("erro: a planta ainda tem %d campo(s) com 'TROCAR'. Uma peça descrita pela metade volta feita pela metade." % bruto.count("TROCAR"))
    d = json.loads(bruto)
    ref = raiz / d.get("referencia", "")
    img = Image.open(ref).convert("RGB") if d.get("referencia") and ref.exists() else None
    (raiz / "frentes").mkdir(exist_ok=True)
    (raiz / "pericia" / "recortes").mkdir(parents=True, exist_ok=True)
    grupos = {}
    for p in d["pecas"]:
        if not all(k in p for k in ("nome", "frente", "o_que_e", "tamanho")):
            sys.exit("erro: toda peça precisa de nome, frente, o_que_e e tamanho: %s" % p.get("nome", "?"))
        grupos.setdefault(p["frente"], []).append(p)
    regra = ("O mundo e o acabamento da referência são mantidos; entram os objetos pedidos, sem marca, logotipo nem texto de terceiros."
             if d.get("modo", "fidelidade") == "fidelidade" else
             "Da referência fica o método e o acabamento; os objetos e a paleta são os do tema novo.")
    for frente, pecas in grupos.items():
        blocos = []
        for p in pecas:
            cx = p.get("caixa_na_ref")
            rtxt = ""
            if img is not None and cx and len(cx) == 4 and cx[2] > cx[0] and cx[3] > cx[1]:
                mx, my = (cx[2] - cx[0]) * 0.12, (cx[3] - cx[1]) * 0.12
                rec = img.crop((max(0, int(cx[0] - mx)), max(0, int(cx[1] - my)), min(img.width, int(cx[2] + mx)), min(img.height, int(cx[3] + my))))
                k = max(1.0, min(4.0, 700 / max(rec.size)))
                rec = rec.resize((round(rec.width * k), round(rec.height * k)), Image.LANCZOS)
                dest = raiz / "pericia" / "recortes" / (p["nome"] + ".jpg")
                rec.save(dest, quality=93)
                rtxt = "\n- **Na referência:** `pericia/recortes/%s.jpg` (o recorte ampliado; a imagem inteira é `%s`)." % (p["nome"], d["referencia"])
            elif d.get("referencia"):
                rtxt = "\n- **Na referência:** esta peça não aparece (é nossa): siga o acabamento geral de `%s`." % d["referencia"]
            blocos.append(PECA.format(nome=p["nome"], o_que_e=p["o_que_e"], tam=" × ".join("%g" % v for v in p["tamanho"]),
                                      material=p.get("material", "o do acabamento geral"), nao_pode_faltar=p.get("nao_pode_faltar", "ler de primeira como o objeto certo"),
                                      mov=("\n- **Movimento (`pose`):** " + p["movimento"]) if p.get("movimento") else "", ref=rtxt))
        txt = BRIEF.format(frente=frente, n=len(pecas), filme=d.get("filme", raiz.name), projeto=str(raiz), acabamento=d.get("acabamento", ""),
                           modo=d.get("modo", "fidelidade"), regra_modo=regra, pecas="\n".join(blocos), escala=d.get("escala", "ver src/ds.js"))
        (raiz / "frentes" / ("BRIEF-%s.md" % frente)).write_text(txt, encoding="utf-8")
        print("frente %-14s %d peça(s): %s  →  frentes/BRIEF-%s.md" % (frente, len(pecas), ", ".join(p["nome"] for p in pecas), frente))
    print("\n%d frente(s). Dispare uma pessoa ou um subagente por frente, todos ao mesmo tempo, cada um com o seu BRIEF como pedido." % len(grupos))
    print("Enquanto isso: câmera, luz e animação na cena, com `carregarPeca(nome, tamanho)` (entra um substituto até a peça existir).")


if __name__ == "__main__":
    main()
