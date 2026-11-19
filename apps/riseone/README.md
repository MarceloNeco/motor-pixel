# Cliente: RiseONE (treino)

Site: solverone.com.br/rise-one/

## Decisão de 16/11/2026

| Tela | Visual | Módulos |
| --- | --- | --- |
| Biblioteca (cartões dos 96 exercícios) | **Fica como está**, simples | nenhum |
| **Detalhe do exercício** (orientação, músculos que trabalha, movimento) | **3D**, girar e dar zoom | `cena3d` (com `girar`), `realce3d`, depois `holograma` |
| **"Onde dói"** (tocar no corpo) e mapa do corpo | **3D** no detalhe; o toque usa `realce3d.aoTocarParte` | `cena3d`, `realce3d` |
| Aparelhos (encosto, pino, placas se mexendo) | 3D, numa segunda etapa | `holograma.controlarAparelho` |
| Modo leve / aparelho fraco | Vetorial com o mesmo vocabulário | `vetor`, `zoom` |

O 3D só baixa quando a pessoa abre o detalhe. Os cartões continuam leves.

## Corpo 3D

- Um modelo .glb de corpo (masculino e feminino), **com cada músculo numa malha separada**. Os nomes são os de `01-camadas-e-nomes.md`, os mesmos da versão vetorial.
- Animações por exercício no esqueleto do corpo (pacote licenciado ou produzido; ver `FONTES.md`).
- Músculo principal pulsando em vermelho, secundários em vermelho claro; tocar num músculo mostra o nome e os exercícios relacionados.

## Arquivos desta pasta

- `01-camadas-e-nomes.md`: nomes dos músculos e das peças, e dados por exercício.
- `02-tecnicas-vetoriais.md`: para o modo leve e os ícones.
- `03-holograma-e-aparelhos-3d.md`: corpo em holograma e aparelhos.

A técnica de cada exercício deve ser revisada por um profissional de educação física.
