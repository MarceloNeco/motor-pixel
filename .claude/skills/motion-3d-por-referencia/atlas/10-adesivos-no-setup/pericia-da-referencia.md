# Perícia da referência: Stamp On Intro (Replay Lab)

Fonte: https://motionarray.com/motion-graphics-templates/stamp-on-intro-3484441/. Template de Premiere com 8 cenas. A prévia pública foi medida: 61,5 s, 1920×1080, 25 quadros por segundo, com trilha. O arquivo da prévia não está nesta pasta; aqui ficam só o link e o que foi medido.

## O mecanismo, em uma frase

Um objeto do dia a dia entra flutuando num estúdio azul, os adesivos são carimbados nele um a um, e uma frase curta em itálico aparece ao lado.

## Estrutura

| # | Janela | Objeto | Frases |
|---|---|---|---|
| 1 | 0,0 a 7,6 s | caixa de papelão (cai aberta, fecha, recebe a fita e os adesivos) | uma pergunta de duas linhas |
| 2 | 7,6 a 15,3 s | mala | título grande de três linhas, depois o mesmo título pequeno ao lado |
| 3 | 15,3 a 23,6 s | skate | duas frases curtas |
| 4 | 23,6 a 31,4 s | rolo de fita e cartela de adesivos | título gigante |
| 5 | 31,4 a 41,1 s | fone de ouvido | título grande, depois duas frases, uma de cada lado |
| 6 | 41,1 a 50,1 s | banana | três frases |
| 7 | 50,1 a 54,8 s | controle de videogame | título grande atrás do objeto |
| 8 | 54,8 a 61,5 s | controle, de novo | chamada final de três linhas |

A gramática de cada bloco:

1. O objeto entra rápido (queda ou giro) e assenta. O título aparece linha a linha.
2. Corte seco para um macro: a câmera deriva devagar e os adesivos aparecem um por vez.
3. Corte seco para o plano aberto: objeto de um lado, frase do outro.
4. Às vezes o objeto troca de lado e uma segunda frase entra.
5. Troca de bloco por corte seco. Em três trocas, uma palavra gigante atravessa a tela, primeiro cheia e depois só em contorno.

O filme fecha com o objeto adesivado à esquerda e uma chamada de três linhas à direita. Não há logo nem cartela final.

## Design

Cores amostradas dos quadros, não estimadas no olho.

| Bloco | O que foi medido | Nosso token |
|---|---|---|
| Fundo, cena da caixa | de `#1c59ac` no canto de cima a `#2d86c4` embaixo, com uma área mais clara perto do chão | topo `#1a54a8`, meio `#2877be`, base `#2f8bc9` |
| Fundo, demais cenas | de `#0d459c` em cima a `#1456ab` no meio, com uma faixa clara `#2d8cc9` só nos últimos 15% | topo `#0c439a`, meio `#1554a9`, base `#2d8cc9` |
| Texto | creme esverdeado, por volta de `#eef5c9` | `#f1f6cc` |
| Papelão | topo `#e0d4c0`, frente `#cfae7f`, lado em sombra `#bf9362`, dentro `#835b34` | base `#d2b287`, dentro `#a88158` |
| Fita | azul-lavanda brilhante, com vincos | `#6f86e4` |

- **Tipografia:** grotesca muito pesada, larga, em itálico, caixa alta, entrelinha perto de 0,85 e espaçamento levemente negativo. Dois tamanhos (título grande e frase lateral). Uma cor só.
- **Adesivos:** cor chapada, contorno preto grosso nos ícones, borda branca de recorte, leve grão de impressão. Aparecem sobrepostos e em ângulos diferentes.
- **Câmera:** sempre lenta dentro do plano. A mudança de ponto de vista é sempre por corte.
- **Camadas:** objeto e adesivos são 3D iluminados; fundo e texto são chapados. O texto fica ora atrás do objeto, ora na frente.
- **Nunca aparece:** fusão entre planos, zoom digital, tremor de câmera, partículas, brilho de lente, vinheta, texto em 3D, cor de destaque no texto, fade de texto.

## Movimento

Medido com `pericia-movimento.py`. Dados brutos em `movimento-referencia.json`.

| Medida | Referência |
|---|---|
| Cortes secos | 23 em 61,5 s (um a cada 2,7 s) |
| Amplitude (pico ÷ mediana) | 4,5× |
| Tempo em quase-parada | 26% |
| Picos | 11, concentrados nas trocas de bloco |

Física lida quadro a quadro:

- **Entrada do objeto:** a caixa cai do alto em 0,40 s, com rastro de movimento, e assenta com dois quiques curtos.
- **Texto:** cada linha aparece seca, sem fade. Intervalo entre linhas: 7 quadros (0,28 s). Sai também por linha.
- **Adesivo:** aparece em 1 ou 2 quadros. Intervalo entre adesivos: de 0,16 a 0,40 s.
- **Macro:** a câmera deriva devagar o tempo todo; é o adesivo que dá o estalo.
- **Palavra gigante:** cruza a tela da direita para a esquerda em cerca de 0,5 s, cheia até o corte e só contorno nos 3 quadros seguintes.

## O que NÃO copiamos

Nenhum adesivo, palavra ou desenho. Os objetos são outros (headset com microfone, notebook, teclado ABNT2), a cor do headset é coral e as frases são nossas, em português. A estrutura também muda: lá a caixa é só o primeiro objeto e os outros entram por corte, sem relação com ela; aqui a caixa é o fio do filme, e tudo o que aparece depois saiu dela. A referência empacota (a caixa fecha); o nosso desempacota.

Fica o método: estúdio de cor única, texto pesado em itálico, adesivo que aparece seco, a gramática de título, macro e frase, o corte seco e a palavra gigante na troca de bloco.

## Movimento do nosso filme, contra a referência

| Medida | Nosso | Referência | Meta | Resultado |
|---|---|---|---|---|
| Amplitude | 9,2× | 4,5× | 3,2× ou mais | passa |
| Tempo em quase-parada | 41% | 26% | 25% ou mais | passa |
| Picos | 7 | 11 | 7 ou mais | passa |

Os sete picos estão nos baldes de 7,5, 8,0, 14,5, 15,0, 21,5, 22,0 e 26,0 s: o estouro da caixa, as três trocas de objeto e a entrada do quadro final. O menor deles está 8% acima do limiar. O nosso filme é mais contrastado que a referência, que mantém os planos abertos mais agitados o tempo todo.
